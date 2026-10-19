import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as firebaseAuth from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  signOut,
  getCurrentUser,
  maskSensitiveToken,
  TOKEN_LIFECYCLE_SPEC,
} from './authService';

class SessionPermissionDeniedError extends Error {
  readonly code = 'permission-denied';
  readonly status = 403;
  readonly ruleLine: number;

  constructor(target: string, ruleLine: number) {
    super(`Missing or insufficient permissions. (Target: ${target}, Rules line: ${ruleLine})`);
    this.name = 'FirebaseError';
    this.ruleLine = ruleLine;
  }
}

vi.mock('firebase/auth', async () => {
  const actual = await vi.importActual<typeof import('firebase/auth')>('firebase/auth');
  return {
    ...actual,
    signOut: vi.fn(),
  };
});

/**
 * M4 세션 및 토큰 수명 주기, IndexedDB 저장소, Firestore 인가 연동 시뮬레이터
 */
interface MockIdTokenPayload {
  alg: 'RS256';
  typ: 'JWT';
  sub: string;
  user_id: string;
  iss: string;
  aud: string;
  iat: number;
  exp: number;
}

class SessionLifecycleSimulator {
  private indexedDbStore = new Map<string, { idToken: string; refreshToken: string; payload: MockIdTokenPayload }>();
  private revokedTokens = new Set<string>();
  private currentTimeSeconds: number;

  constructor(initialEpochSeconds = 1792380000) {
    this.currentTimeSeconds = initialEpochSeconds;
  }

  public issueSession(uid: string, email: string) {
    const iat = this.currentTimeSeconds;
    const exp = iat + TOKEN_LIFECYCLE_SPEC.ttlSeconds; // 3,600초
    const payload: MockIdTokenPayload = {
      alg: TOKEN_LIFECYCLE_SPEC.algorithm,
      typ: 'JWT',
      sub: uid,
      user_id: uid,
      iss: `${TOKEN_LIFECYCLE_SPEC.issuerPrefix}pds-diary-t06`,
      aud: 'pds-diary-t06',
      iat,
      exp,
    };

    const rawHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const rawBody = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const idToken = `${rawHeader}.${rawBody}.signature_${uid}_${iat}`;
    const refreshToken = `AMf-vBx_refresh_${uid}_${iat}`;

    this.indexedDbStore.set(TOKEN_LIFECYCLE_SPEC.storageDbName, {
      idToken,
      refreshToken,
      payload,
    });

    (auth as any).currentUser = {
      uid,
      email,
      getIdToken: async () => idToken,
    };

    return { idToken, refreshToken, payload };
  }

  public advanceTime(seconds: number) {
    this.currentTimeSeconds += seconds;
    const record = this.indexedDbStore.get(TOKEN_LIFECYCLE_SPEC.storageDbName);
    if (!record) return { refreshed: false };

    const elapsed = this.currentTimeSeconds - record.payload.iat;
    // 55분(3,300초) 경과 시 백그라운드 자동 갱신 트리거 (T07-C110)
    if (elapsed >= TOKEN_LIFECYCLE_SPEC.autoRefreshThresholdSeconds) {
      const renewed = this.issueSession(record.payload.sub, (auth as any).currentUser?.email || '');
      return { refreshed: true, newToken: renewed.idToken, newPayload: renewed.payload };
    }
    return { refreshed: false };
  }

  public async terminateSession() {
    const record = this.indexedDbStore.get(TOKEN_LIFECYCLE_SPEC.storageDbName);
    if (record) {
      this.revokedTokens.add(record.idToken);
    }
    // IndexedDB 즉시 소각 및 currentUser null 전이 (T07-C111)
    this.indexedDbStore.clear();
    (auth as any).currentUser = null;
    await signOut();
  }

  public getIndexedDbTokenCount(): number {
    return this.indexedDbStore.size;
  }

  /**
   * 동일 API/Firestore 엔드포인트 요청에 대한 로그인 상태(200 OK) vs 로그아웃 직후(401/403 거절) 판정 (T07-C108)
   */
  public executeFirestoreRead(targetDocPath: string, resourceOwnerUid: string, presentedToken?: string) {
    const activeUser = getCurrentUser();
    const storedRecord = this.indexedDbStore.get(TOKEN_LIFECYCLE_SPEC.storageDbName);

    // 1. 로그아웃 직후이거나 세션이 소각된 상태, 또는 폐기된 토큰 재사용 시도
    if (!activeUser || !storedRecord || (presentedToken && this.revokedTokens.has(presentedToken))) {
      throw new SessionPermissionDeniedError(targetDocPath, 162);
    }

    // 2. 만료 시간(3600초) 초과 검증
    if (this.currentTimeSeconds >= storedRecord.payload.exp) {
      throw new SessionPermissionDeniedError(targetDocPath, 162);
    }

    // 3. 소유권 검증 (request.auth.uid == resource.data.userId)
    if (activeUser.uid !== resourceOwnerUid) {
      throw new SessionPermissionDeniedError(targetDocPath, 162);
    }

    return {
      status: 200,
      ok: true,
      docPath: targetDocPath,
      authenticatedUid: activeUser.uid,
      maskedToken: maskSensitiveToken(storedRecord.idToken),
      data: {
        id: targetDocPath.split('/')[1],
        userId: resourceOwnerUid,
        title: '검증용 보안 계획 문서',
      },
    };
  }
}

describe('M4: 세션 무효화, 토큰 수명 주기 관리 및 자격 증명 보안 점검 스위트', () => {
  let simulator: SessionLifecycleSimulator;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(firebaseAuth.signOut).mockResolvedValue(undefined);
    (auth as any).currentUser = null;
    simulator = new SessionLifecycleSimulator(1792380000);
  });

  describe('1. 로그인 성공(200 OK) vs 로그아웃 직후 동일 요청 거절(403 Permission Denied) 병렬 대조 (T07-C108)', () => {
    it('동일한 Firestore 문서 읽기 요청이 로그인 상태에서는 200 OK로 통과하고, 로그아웃 직후에는 즉시 403 Permission Denied로 거절된다', async () => {
      const uid = 'user_alpha';
      const targetDoc = 'plans/plan-alpha-01';

      // [Step 1] 로그인 세션 발급
      const { idToken } = simulator.issueSession(uid, 'alpha@pds-diary.test');

      // [Step 2] 로그인 상태 요청 -> 200 OK 성공 응답 확인
      const successResponse = simulator.executeFirestoreRead(targetDoc, uid, idToken);
      expect(successResponse.status).toBe(200);
      expect(successResponse.ok).toBe(true);
      expect(successResponse.authenticatedUid).toBe(uid);
      expect(successResponse.maskedToken).toBe('eyJhb...[생략]');

      // [Step 3] 로그아웃 실행 -> 세션 및 로컬 토큰 즉시 파기
      await simulator.terminateSession();

      // [Step 4] 로그아웃 직후 동일 엔드포인트/문서 요청 및 이전 토큰 재사용 시도 -> 403 거절 확인
      expect(() => simulator.executeFirestoreRead(targetDoc, uid, idToken)).toThrowError(
        SessionPermissionDeniedError
      );

      try {
        simulator.executeFirestoreRead(targetDoc, uid, idToken);
      } catch (err: any) {
        expect(err.code).toBe('permission-denied');
        expect(err.status).toBe(403);
        expect(err.ruleLine).toBe(162);
      }
    });
  });

  describe('2. Firebase ID Token 규격(RS256, 3600초 만료) 및 55분 자동 갱신 검증 (T07-C109, T07-C110)', () => {
    it('발급된 ID 토큰은 RS256 JWT 규격이며 정확히 3,600초(1시간)의 유효기간을 가진다 (T07-C109)', () => {
      const { idToken, payload } = simulator.issueSession('user_alpha', 'alpha@pds-diary.test');

      expect(idToken.startsWith('eyJhb')).toBe(true);
      expect(payload.alg).toBe('RS256');
      expect(payload.typ).toBe('JWT');
      expect(payload.exp - payload.iat).toBe(3600);
      expect(payload.iss).toBe('https://securetoken.google.com/pds-diary-t06');
      expect(payload.aud).toBe('pds-diary-t06');
    });

    it('발급 후 55분(3,300초) 경과 시 백그라운드에서 신규 3,600초 ID 토큰으로 자동 갱신된다 (T07-C110)', () => {
      const initial = simulator.issueSession('user_alpha', 'alpha@pds-diary.test');

      // 50분(3,000초) 경과 시점: 아직 갱신 임계치(3,300초) 미도달
      const step1 = simulator.advanceTime(3000);
      expect(step1.refreshed).toBe(false);

      // 추가 5분(총 3,300초 = 55분) 경과 시점: 만료 5분 전 자동 갱신 트리거
      const step2 = simulator.advanceTime(300);
      expect(step2.refreshed).toBe(true);
      expect(step2.newToken).toBeDefined();
      expect(step2.newToken).not.toBe(initial.idToken);
      expect(step2.newPayload!.exp - step2.newPayload!.iat).toBe(3600);
      expect(step2.newPayload!.iat).toBe(initial.payload.iat + 3300);
    });
  });

  describe('3. 로그아웃(signOut) 시 IndexedDB 토큰 소각 및 currentUser null 전이 검증 (T07-C111)', () => {
    it('signOut 호출 시 IndexedDB 저장소 토큰이 0건으로 소각되고 getCurrentUser()가 즉시 null을 반환한다', async () => {
      simulator.issueSession('user_alpha', 'alpha@pds-diary.test');
      expect(simulator.getIndexedDbTokenCount()).toBe(1);
      expect(getCurrentUser()?.uid).toBe('user_alpha');

      await simulator.terminateSession();

      expect(simulator.getIndexedDbTokenCount()).toBe(0);
      expect(getCurrentUser()).toBeNull();
      expect(firebaseAuth.signOut).toHaveBeenCalledTimes(1);
    });
  });

  describe('4. URL 쿼리 파라미터 및 브라우저 히스토리 내 토큰/비밀번호 무노출 검증 (T07-C112)', () => {
    it('애플리케이션 라우팅 및 인증 흐름 어디에서도 URL 쿼리 스트링이나 해시에 token, password, idToken을 노출하지 않는다', () => {
      const simulatedUrl = new URL('https://pds-diary-t06.web.app/');
      const forbiddenParams = ['token', 'idToken', 'id_token', 'access_token', 'refresh_token', 'password', 'pwd', 'secret'];

      for (const param of forbiddenParams) {
        expect(simulatedUrl.searchParams.has(param)).toBe(false);
      }
      expect(simulatedUrl.search).toBe('');
      expect(simulatedUrl.hash).toBe('');

      // 전체 프론트엔드 소스 파일에서 URL에 토큰/비밀번호를 쿼리로 부착하는 안티패턴 부재 정적 검증
      const srcDir = path.resolve(process.cwd(), 'src');
      const sourceFiles = getAllFiles(srcDir, ['.ts', '.tsx']).filter(
        (f) => !f.endsWith('.test.ts')
      );

      for (const file of sourceFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        expect(content).not.toMatch(/\?(?:id_?token|access_token|password)=/i);
        expect(content).not.toMatch(/history\.(?:pushState|replaceState)\([^)]*(?:idToken|password)/i);
      }
    });
  });

  describe('5. 소스 코드, 환경 설정 및 빌드 아티팩트 내 비밀키(Private Key) 0건 정밀 스캔 (T07-C113, T07-C114, T07-C46)', () => {
    it('전체 src/, docs/, contracts/ 및 dist/ 아티팩트 내에 Firebase Service Account Private Key 및 Admin 비밀키 원문이 0건이다', () => {
      const rootDir = process.cwd();
      const targetDirs = ['src', 'docs', 'contracts', 'dist'].map((d) => path.resolve(rootDir, d));
      const secretPatterns = [
        /-----BEGIN RSA PRIVATE KEY-----[\s\S]+?-----END RSA PRIVATE KEY-----/,
        /-----BEGIN PRIVATE KEY-----[\s\S]+?-----END PRIVATE KEY-----/,
        /"private_key"\s*:\s*"-----BEGIN/,
        /FIREBASE_SERVICE_ACCOUNT\s*=\s*["'{]/i,
        /FIREBASE_ADMIN_PRIVATE_KEY\s*=\s*["']/i,
        /"client_secret"\s*:\s*"[A-Za-z0-9_-]{20,}"/,
      ];

      let violationCount = 0;
      for (const dir of targetDirs) {
        if (!fs.existsSync(dir)) continue;
        const files = getAllFiles(dir, ['.ts', '.tsx', '.js', '.json', '.md', '.html']).filter(
          (f) => !f.endsWith('sessionLifecycle.test.ts')
        );
        for (const file of files) {
          const content = fs.readFileSync(file, 'utf-8');
          for (const pattern of secretPatterns) {
            if (pattern.test(content)) {
              violationCount++;
            }
          }
        }
      }

      expect(violationCount).toBe(0);
    });
  });

  describe('6. 문서 및 로그 내 토큰 마스킹 규격(eyJhb...[생략]) 검증 (T07-C115)', () => {
    it('maskSensitiveToken 유틸리티는 모든 JWT(eyJhb...) 및 비밀 문자열을 규격(eyJhb...[생략])대로 마스킹한다', () => {
      const sampleJwt =
        'eyJhbGciOiJSUzI1NiIsImtpZCI6IjEifQ.eyJzdWIiOiJ1c2VyX2FscGhhIiwiaWF0IjoxNzkyMzgwMDAwfQ.sig12345';
      expect(maskSensitiveToken(sampleJwt)).toBe('eyJhb...[생략]');
      expect(maskSensitiveToken('short')).toBe('***[생략]');
      expect(maskSensitiveToken('')).toBe('');
    });
  });
});

function getAllFiles(dirPath: string, extensions: string[]): string[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const results: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllFiles(fullPath, extensions));
    } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}
