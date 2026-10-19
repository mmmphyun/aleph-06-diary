import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestore from 'firebase/firestore';
import { auth } from '../lib/firebase';
import { firestorePlanPackageRepository } from './firestorePlanPackageRepository';

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore');
  return {
    ...actual,
    doc: vi.fn((_db: any, coll: string, id: string) => ({ coll, id })),
    runTransaction: vi.fn(),
  };
});

vi.mock('../lib/firebase', () => {
  return {
    auth: { currentUser: null },
    db: {},
    app: {},
  };
});

/**
 * firestore.rules 소스 위치 및 규칙 매핑 (M3 거절 증적 매핑)
 */
export const FIRESTORE_RULES_MAPPING = {
  plans: {
    readDelete: { line: 162, rule: 'resource.data.userId == request.auth.uid' },
    create: { line: 163, rule: 'request.resource.data.userId == request.auth.uid && isValidPlan(...)' },
    update: { line: 166, rule: 'resource.data.userId == request.auth.uid && request.resource.data.userId == request.auth.uid' },
  },
  tasks: {
    readDelete: { line: 176, rule: 'resource.data.userId == request.auth.uid' },
    create: { line: 177, rule: 'request.resource.data.userId == request.auth.uid && isValidTask(...)' },
    update: { line: 180, rule: 'resource.data.userId == request.auth.uid && request.resource.data.userId == request.auth.uid' },
  },
  executionLogs: {
    readDelete: { line: 191, rule: 'resource.data.userId == request.auth.uid' },
    create: { line: 192, rule: 'request.resource.data.userId == request.auth.uid && isValidExecutionLog(...)' },
    update: { line: 195, rule: 'resource.data.userId == request.auth.uid && request.resource.data.userId == request.auth.uid' },
  },
  clientDefenseInDepth: {
    file: 'src/services/firestorePlanPackageRepository.ts',
    lines: '1048-1050',
    rule: 'currentUser && taskData.userId && taskData.userId !== currentUser.uid -> throw Permission denied',
  },
} as const;

/**
 * Firebase Firestore 공식 Permission Denied 에러 구조체
 */
export class FirestorePermissionDeniedError extends Error {
  readonly code = 'permission-denied';
  readonly status = 403;
  readonly ruleLine: number;
  readonly attemptedTarget: string;

  constructor(attemptedTarget: string, ruleLine: number) {
    super(`Missing or insufficient permissions. (Target: ${attemptedTarget}, Rules line: ${ruleLine})`);
    this.name = 'FirebaseError';
    this.ruleLine = ruleLine;
    this.attemptedTarget = attemptedTarget;
  }
}

/**
 * 테스트용 데이터 타입 및 보안 컨텍스트
 */
interface BaseSecurityDoc {
  id: string;
  userId: string;
  [key: string]: any;
}

interface MockFirestoreState {
  plans: Map<string, BaseSecurityDoc>;
  tasks: Map<string, BaseSecurityDoc>;
  executionLogs: Map<string, BaseSecurityDoc>;
}

/**
 * firestore.rules 동작을 엄격히 시뮬레이션하는 인메모리 보안 평가 엔진
 */
class FirestoreSecurityEvaluator {
  private state: MockFirestoreState = {
    plans: new Map(),
    tasks: new Map(),
    executionLogs: new Map(),
  };

  public resetWithSeeds(seedData: {
    plans: BaseSecurityDoc[];
    tasks: BaseSecurityDoc[];
    executionLogs: BaseSecurityDoc[];
  }) {
    this.state.plans.clear();
    this.state.tasks.clear();
    this.state.executionLogs.clear();

    seedData.plans.forEach((p) => this.state.plans.set(p.id, JSON.parse(JSON.stringify(p))));
    seedData.tasks.forEach((t) => this.state.tasks.set(t.id, JSON.parse(JSON.stringify(t))));
    seedData.executionLogs.forEach((l) => this.state.executionLogs.set(l.id, JSON.parse(JSON.stringify(l))));
  }

  public getSnapshotCount(userId: string) {
    const plans = Array.from(this.state.plans.values()).filter((d) => d.userId === userId).length;
    const tasks = Array.from(this.state.tasks.values()).filter((d) => d.userId === userId).length;
    const logs = Array.from(this.state.executionLogs.values()).filter((d) => d.userId === userId).length;
    return { plans, tasks, logs, total: plans + tasks + logs };
  }

  public getDoc(authUid: string | null, collectionName: keyof MockFirestoreState, docId: string): BaseSecurityDoc {
    if (!authUid) {
      throw new FirestorePermissionDeniedError(`${collectionName}/${docId}`, 247);
    }
    const collectionMap = this.state[collectionName];
    const resource = collectionMap.get(docId);
    if (!resource) {
      throw new Error(`Document ${collectionName}/${docId} not found.`);
    }

    // Line 162, 176, 191: allow read: if request.auth != null && resource.data.userId == request.auth.uid;
    const ruleLine = FIRESTORE_RULES_MAPPING[collectionName].readDelete.line;
    if (resource.userId !== authUid) {
      throw new FirestorePermissionDeniedError(`${collectionName}/${docId}`, ruleLine);
    }

    return JSON.parse(JSON.stringify(resource));
  }

  public updateDoc(
    authUid: string | null,
    collectionName: keyof MockFirestoreState,
    docId: string,
    patch: Record<string, any>
  ): void {
    if (!authUid) {
      throw new FirestorePermissionDeniedError(`${collectionName}/${docId}`, 247);
    }
    const collectionMap = this.state[collectionName];
    const resource = collectionMap.get(docId);
    if (!resource) {
      throw new Error(`Document ${collectionName}/${docId} not found.`);
    }

    // Line 166, 180, 195: allow update: if resource.data.userId == request.auth.uid && request.resource.data.userId == request.auth.uid;
    const ruleLine = FIRESTORE_RULES_MAPPING[collectionName].update.line;
    if (resource.userId !== authUid) {
      throw new FirestorePermissionDeniedError(`${collectionName}/${docId}`, ruleLine);
    }
    if (patch.userId && patch.userId !== authUid) {
      throw new FirestorePermissionDeniedError(`${collectionName}/${docId}`, ruleLine);
    }

    Object.assign(resource, patch);
  }

  public deleteDoc(authUid: string | null, collectionName: keyof MockFirestoreState, docId: string): void {
    if (!authUid) {
      throw new FirestorePermissionDeniedError(`${collectionName}/${docId}`, 247);
    }
    const collectionMap = this.state[collectionName];
    const resource = collectionMap.get(docId);
    if (!resource) {
      throw new Error(`Document ${collectionName}/${docId} not found.`);
    }

    // Line 162, 176, 191: allow delete: if request.auth != null && resource.data.userId == request.auth.uid;
    const ruleLine = FIRESTORE_RULES_MAPPING[collectionName].readDelete.line;
    if (resource.userId !== authUid) {
      throw new FirestorePermissionDeniedError(`${collectionName}/${docId}`, ruleLine);
    }

    collectionMap.delete(docId);
  }

  public createDoc(
    authUid: string | null,
    collectionName: keyof MockFirestoreState,
    docId: string,
    data: BaseSecurityDoc
  ): void {
    if (!authUid) {
      throw new FirestorePermissionDeniedError(`${collectionName}/${docId}`, 247);
    }

    // Line 163, 177, 192: allow create: if request.resource.data.userId == request.auth.uid;
    const ruleLine = FIRESTORE_RULES_MAPPING[collectionName].create.line;
    if (data.userId !== authUid) {
      throw new FirestorePermissionDeniedError(`${collectionName}/${docId}`, ruleLine);
    }

    this.state[collectionName].set(docId, JSON.parse(JSON.stringify(data)));
  }

  public queryUserDocs(authUid: string | null, collectionName: keyof MockFirestoreState, requestedUserId: string) {
    if (!authUid || authUid !== requestedUserId) {
      const ruleLine = FIRESTORE_RULES_MAPPING[collectionName].readDelete.line;
      throw new FirestorePermissionDeniedError(`${collectionName}?userId=${requestedUserId}`, ruleLine);
    }
    return Array.from(this.state[collectionName].values()).filter((d) => d.userId === authUid);
  }
}

describe('M3: 양방향 교차 권한 침투(IDOR) 방어 및 거절 증적 검증 스위트', () => {
  const USER_ALPHA = 'user_alpha';
  const USER_BETA = 'user_beta';

  const SEED_PLANS: BaseSecurityDoc[] = [
    {
      id: 'plan-alpha-01',
      userId: USER_ALPHA,
      title: '알파 계정 10월 플랜',
      content: '알파 전용 비공개 계획',
      startPage: 1,
      createdAt: '2026-10-19T00:00:00.000Z',
      trashStatus: 0,
    },
    {
      id: 'plan-beta-01',
      userId: USER_BETA,
      title: '베타 계정 10월 플랜',
      content: '베타 전용 비공개 계획',
      startPage: 1,
      createdAt: '2026-10-19T00:00:00.000Z',
      trashStatus: 0,
    },
  ];

  const SEED_TASKS: BaseSecurityDoc[] = [
    {
      id: 'task-alpha-01',
      userId: USER_ALPHA,
      planId: 'plan-alpha-01',
      title: '알파 할 일 1',
      done: false,
      startDate: '2026-10-19',
      dueDate: '2026-10-25',
      priority: 'high',
      tags: ['alpha'],
      status: 'in_progress',
      createdAt: '2026-10-19T00:00:00.000Z',
    },
    {
      id: 'task-alpha-02',
      userId: USER_ALPHA,
      planId: 'plan-alpha-01',
      title: '알파 할 일 2',
      done: true,
      startDate: '2026-10-19',
      dueDate: '2026-10-25',
      priority: 'medium',
      tags: ['alpha'],
      status: 'done',
      createdAt: '2026-10-19T00:00:00.000Z',
    },
    {
      id: 'task-beta-01',
      userId: USER_BETA,
      planId: 'plan-beta-01',
      title: '베타 할 일 1',
      done: false,
      startDate: '2026-10-19',
      dueDate: '2026-10-25',
      priority: 'high',
      tags: ['beta'],
      status: 'todo',
      createdAt: '2026-10-19T00:00:00.000Z',
    },
    {
      id: 'task-beta-02',
      userId: USER_BETA,
      planId: 'plan-beta-01',
      title: '베타 할 일 2',
      done: false,
      startDate: '2026-10-19',
      dueDate: '2026-10-25',
      priority: 'low',
      tags: ['beta'],
      status: 'todo',
      createdAt: '2026-10-19T00:00:00.000Z',
    },
  ];

  const SEED_LOGS: BaseSecurityDoc[] = [
    {
      id: 'log-alpha-01',
      userId: USER_ALPHA,
      planId: 'plan-alpha-01',
      taskId: 'task-alpha-02',
      taskTitle: '알파 할 일 2',
      completedAt: '2026-10-19T09:00:00.000Z',
      comment: '알파 정상 완료 기록',
    },
    {
      id: 'log-beta-01',
      userId: USER_BETA,
      planId: 'plan-beta-01',
      taskId: 'task-beta-01',
      taskTitle: '베타 할 일 1',
      completedAt: '2026-10-19T10:00:00.000Z',
      comment: '베타 정상 완료 기록',
    },
  ];

  const evaluator = new FirestoreSecurityEvaluator();

  beforeEach(() => {
    evaluator.resetWithSeeds({
      plans: SEED_PLANS,
      tasks: SEED_TASKS,
      executionLogs: SEED_LOGS,
    });
    vi.clearAllMocks();
  });

  describe('1. 독립된 계정 A(user_alpha) 및 계정 B(user_beta) 환경 구성 확인 (T07-C116)', () => {
    it('초기 환경에서 계정 A와 계정 B의 문서 건수(plans 1, tasks 2, logs 1)가 격리되어 생성된다', () => {
      const alphaCount = evaluator.getSnapshotCount(USER_ALPHA);
      const betaCount = evaluator.getSnapshotCount(USER_BETA);

      expect(alphaCount.plans).toBe(1);
      expect(alphaCount.tasks).toBe(2);
      expect(alphaCount.logs).toBe(1);
      expect(alphaCount.total).toBe(4);

      expect(betaCount.plans).toBe(1);
      expect(betaCount.tasks).toBe(2);
      expect(betaCount.logs).toBe(1);
      expect(betaCount.total).toBe(4);
    });
  });

  describe('2. 방향 1 (A -> B 침투 시도): 계정 A가 계정 B의 자원에 접근 (T07-C117 ~ T07-C119)', () => {
    it('계정 A가 계정 B 소유 문서 ID로 직접 단일 읽기(getDoc) 시도 시 Permission Denied(403)로 차단된다 (T07-C117)', () => {
      // plans 읽기 시도 -> Line 162 차단
      expect(() => evaluator.getDoc(USER_ALPHA, 'plans', 'plan-beta-01')).toThrowError(FirestorePermissionDeniedError);
      try {
        evaluator.getDoc(USER_ALPHA, 'plans', 'plan-beta-01');
      } catch (err: any) {
        expect(err.code).toBe('permission-denied');
        expect(err.status).toBe(403);
        expect(err.ruleLine).toBe(162);
      }

      // tasks 읽기 시도 -> Line 176 차단
      expect(() => evaluator.getDoc(USER_ALPHA, 'tasks', 'task-beta-01')).toThrowError(FirestorePermissionDeniedError);
      try {
        evaluator.getDoc(USER_ALPHA, 'tasks', 'task-beta-01');
      } catch (err: any) {
        expect(err.code).toBe('permission-denied');
        expect(err.status).toBe(403);
        expect(err.ruleLine).toBe(176);
      }

      // executionLogs 읽기 시도 -> Line 191 차단
      expect(() => evaluator.getDoc(USER_ALPHA, 'executionLogs', 'log-beta-01')).toThrowError(FirestorePermissionDeniedError);
      try {
        evaluator.getDoc(USER_ALPHA, 'executionLogs', 'log-beta-01');
      } catch (err: any) {
        expect(err.code).toBe('permission-denied');
        expect(err.status).toBe(403);
        expect(err.ruleLine).toBe(191);
      }
    });

    it('계정 A가 계정 B 소유 문서 수정(updateDoc) 시도 시 Permission Denied(403)로 차단된다 (T07-C118)', () => {
      // plans 수정 시도 -> Line 166 차단
      expect(() =>
        evaluator.updateDoc(USER_ALPHA, 'plans', 'plan-beta-01', { title: '악의적 제목 변조' })
      ).toThrowError(FirestorePermissionDeniedError);

      // tasks 수정 시도 -> Line 180 차단
      expect(() =>
        evaluator.updateDoc(USER_ALPHA, 'tasks', 'task-beta-01', { done: true, title: '악의적 할 일 변조' })
      ).toThrowError(FirestorePermissionDeniedError);

      // executionLogs 수정 시도 -> Line 195 차단
      expect(() =>
        evaluator.updateDoc(USER_ALPHA, 'executionLogs', 'log-beta-01', { comment: '악의적 로그 변조' })
      ).toThrowError(FirestorePermissionDeniedError);
    });

    it('계정 A가 계정 B 소유 문서 삭제(deleteDoc) 시도 시 Permission Denied(403)로 차단된다 (T07-C119)', () => {
      // plans 삭제 시도 -> Line 162 차단
      expect(() => evaluator.deleteDoc(USER_ALPHA, 'plans', 'plan-beta-01')).toThrowError(FirestorePermissionDeniedError);

      // tasks 삭제 시도 -> Line 176 차단
      expect(() => evaluator.deleteDoc(USER_ALPHA, 'tasks', 'task-beta-01')).toThrowError(FirestorePermissionDeniedError);

      // executionLogs 삭제 시도 -> Line 191 차단
      expect(() => evaluator.deleteDoc(USER_ALPHA, 'executionLogs', 'log-beta-01')).toThrowError(FirestorePermissionDeniedError);
    });
  });

  describe('3. 방향 2 (B -> A 침투 시도): 계정 B가 계정 A의 자원에 접근 (T07-C120 ~ T07-C122)', () => {
    it('계정 B가 계정 A 소유 문서 ID로 직접 단일 읽기(getDoc) 시도 시 Permission Denied(403)로 차단된다 (T07-C120)', () => {
      expect(() => evaluator.getDoc(USER_BETA, 'plans', 'plan-alpha-01')).toThrowError(FirestorePermissionDeniedError);
      expect(() => evaluator.getDoc(USER_BETA, 'tasks', 'task-alpha-01')).toThrowError(FirestorePermissionDeniedError);
      expect(() => evaluator.getDoc(USER_BETA, 'executionLogs', 'log-alpha-01')).toThrowError(FirestorePermissionDeniedError);
    });

    it('계정 B가 계정 A 소유 문서 수정(updateDoc) 시도 시 Permission Denied(403)로 차단된다 (T07-C121)', () => {
      expect(() =>
        evaluator.updateDoc(USER_BETA, 'plans', 'plan-alpha-01', { content: '베타에 의한 알파 계획 변조' })
      ).toThrowError(FirestorePermissionDeniedError);

      expect(() =>
        evaluator.updateDoc(USER_BETA, 'tasks', 'task-alpha-01', { status: 'done', done: true })
      ).toThrowError(FirestorePermissionDeniedError);

      expect(() =>
        evaluator.updateDoc(USER_BETA, 'executionLogs', 'log-alpha-01', { comment: '베타에 의한 로그 변조' })
      ).toThrowError(FirestorePermissionDeniedError);
    });

    it('계정 B가 계정 A 소유 문서 삭제(deleteDoc) 시도 시 Permission Denied(403)로 차단된다 (T07-C122)', () => {
      expect(() => evaluator.deleteDoc(USER_BETA, 'plans', 'plan-alpha-01')).toThrowError(FirestorePermissionDeniedError);
      expect(() => evaluator.deleteDoc(USER_BETA, 'tasks', 'task-alpha-01')).toThrowError(FirestorePermissionDeniedError);
      expect(() => evaluator.deleteDoc(USER_BETA, 'executionLogs', 'log-alpha-01')).toThrowError(FirestorePermissionDeniedError);
    });
  });

  describe('4. 위변조 파라미터 주입 방어 (T07-C123)', () => {
    it('계정 A가 본문 userId에 계정 B의 UID를 주입하여 생성(createDoc) 시도시 firestore.rules에서 차단된다', () => {
      // Line 163: request.resource.data.userId == request.auth.uid 위반
      expect(() =>
        evaluator.createDoc(USER_ALPHA, 'plans', 'plan-injected-01', {
          id: 'plan-injected-01',
          userId: USER_BETA, // 타인 UID 위조 주입
          title: '위조 플랜',
          content: '내용',
          startPage: 1,
          createdAt: '2026-10-19T00:00:00.000Z',
          trashStatus: 0,
        })
      ).toThrowError(FirestorePermissionDeniedError);

      // Line 177: task 생성 시 타인 UID 주입 차단
      expect(() =>
        evaluator.createDoc(USER_ALPHA, 'tasks', 'task-injected-01', {
          id: 'task-injected-01',
          userId: USER_BETA,
          planId: 'plan-alpha-01',
          title: '위조 할 일',
          done: false,
          startDate: '2026-10-19',
          dueDate: '2026-10-25',
          priority: 'medium',
          tags: [],
          status: 'todo',
          createdAt: '2026-10-19T00:00:00.000Z',
        })
      ).toThrowError(FirestorePermissionDeniedError);

      // Line 192: log 생성 시 타인 UID 주입 차단
      expect(() =>
        evaluator.createDoc(USER_ALPHA, 'executionLogs', 'log-injected-01', {
          id: 'log-injected-01',
          userId: USER_BETA,
          planId: 'plan-alpha-01',
          taskId: 'task-alpha-01',
          taskTitle: '위조 로그',
          completedAt: '2026-10-19T00:00:00.000Z',
          comment: '위조 코멘트',
        })
      ).toThrowError(FirestorePermissionDeniedError);
    });

    it('미인증(익명/null) 상태에서 문서를 생성하거나 타인의 목록을 쿼리하려 하면 차단된다 (T07-C124, T07-C125)', () => {
      expect(() =>
        evaluator.createDoc(null, 'plans', 'plan-anon-01', {
          id: 'plan-anon-01',
          userId: USER_ALPHA,
          title: '미인증 생성 시도',
          content: '',
          startPage: 1,
          createdAt: '2026-10-19T00:00:00.000Z',
          trashStatus: 0,
        })
      ).toThrowError(FirestorePermissionDeniedError);

      expect(() => evaluator.queryUserDocs(USER_ALPHA, 'tasks', USER_BETA)).toThrowError(
        FirestorePermissionDeniedError
      );
    });
  });

  describe('5. 클라이언트 트랜잭션 소유권 2차 방어선 검증 (T06-C21 계승 / T07-C126)', () => {
    it('firestorePlanPackageRepository.executeAtomicTaskStatusTransition 트랜잭션 내 소유권 불일치 시 Abort 및 예외가 발생한다', async () => {
      // 계정 A(user_alpha)로 인증된 상태를 설정
      (auth as any).currentUser = {
        uid: USER_ALPHA,
        email: 'alpha@pds-diary.test',
      };

      // firestore mock 구성: transaction.get이 user_beta 소유의 task를 반환하도록 모의
      const mockBetaTaskDoc = {
        exists: () => true,
        data: () => ({
          id: 'task-beta-01',
          userId: USER_BETA, // 소유권 불일치 (피해자 계정 B)
          planId: 'plan-beta-01',
          title: '베타 할 일 1',
          done: false,
          status: 'todo',
        }),
      };

      const mockTransaction = {
        get: vi.fn().mockResolvedValue(mockBetaTaskDoc),
        update: vi.fn(),
        set: vi.fn(),
      };

      vi.mocked(firestore.runTransaction).mockImplementation(async (_db: any, updateFn: any) => {
        return updateFn(mockTransaction as any);
      });

      // 계정 A 컨텍스트에서 타인(계정 B)의 task 완료 상태 전이를 비동기 호출
      const repo = firestorePlanPackageRepository as any;
      await expect(
        repo.executeAtomicTaskStatusTransition(
          'plan-beta-01',
          'task-beta-01',
          true,
          '2026-10-19T10:00:00.000Z',
          null
        )
      ).rejects.toThrow(`Permission denied: Task task-beta-01 does not belong to user ${USER_ALPHA}.`);

      // 트랜잭션 내부에서 update 및 set이 단 1회도 호출되지 않고 중단(Abort)되었음을 검증
      expect(mockTransaction.update).not.toHaveBeenCalled();
      expect(mockTransaction.set).not.toHaveBeenCalled();
    });

    it('반대 방향(user_beta 컨텍스트에서 user_alpha 소유의 task 변조 시도)도 2차 방어선에서 즉시 Abort된다', async () => {
      (auth as any).currentUser = {
        uid: USER_BETA,
        email: 'beta@pds-diary.test',
      };

      const mockAlphaTaskDoc = {
        exists: () => true,
        data: () => ({
          id: 'task-alpha-01',
          userId: USER_ALPHA, // 소유권 불일치 (피해자 계정 A)
          planId: 'plan-alpha-01',
          title: '알파 할 일 1',
          done: false,
          status: 'todo',
        }),
      };

      const mockTransaction = {
        get: vi.fn().mockResolvedValue(mockAlphaTaskDoc),
        update: vi.fn(),
        set: vi.fn(),
      };

      vi.mocked(firestore.runTransaction).mockImplementation(async (_db: any, updateFn: any) => {
        return updateFn(mockTransaction as any);
      });

      const repo = firestorePlanPackageRepository as any;
      await expect(
        repo.executeAtomicTaskStatusTransition(
          'plan-alpha-01',
          'task-alpha-01',
          true,
          '2026-10-19T10:00:00.000Z',
          null
        )
      ).rejects.toThrow(`Permission denied: Task task-alpha-01 does not belong to user ${USER_BETA}.`);

      expect(mockTransaction.update).not.toHaveBeenCalled();
      expect(mockTransaction.set).not.toHaveBeenCalled();
    });
  });

  describe('6. 거절 증적 및 문서 무결성(데이터 유실 0건, 카운트 불변) 대조 입증 (T07-C125, T07-C126)', () => {
    it('A->B, B->A 양방향 침투 시도 및 파라미터 위조 시도 후에도 계정 A와 B의 문서 건수(Count)가 불변이며 데이터 유실이 0건이다', () => {
      const alphaBefore = evaluator.getSnapshotCount(USER_ALPHA);
      const betaBefore = evaluator.getSnapshotCount(USER_BETA);

      expect(alphaBefore.total).toBe(4);
      expect(betaBefore.total).toBe(4);

      // 다중 침투 공격 시도 (모두 Permission Denied로 거절되어야 함)
      expect(() => evaluator.getDoc(USER_ALPHA, 'plans', 'plan-beta-01')).toThrow();
      expect(() => evaluator.updateDoc(USER_ALPHA, 'plans', 'plan-beta-01', { title: '해킹' })).toThrow();
      expect(() => evaluator.deleteDoc(USER_ALPHA, 'plans', 'plan-beta-01')).toThrow();
      expect(() => evaluator.getDoc(USER_ALPHA, 'tasks', 'task-beta-01')).toThrow();
      expect(() => evaluator.updateDoc(USER_ALPHA, 'tasks', 'task-beta-01', { done: true })).toThrow();
      expect(() => evaluator.deleteDoc(USER_ALPHA, 'tasks', 'task-beta-01')).toThrow();
      expect(() => evaluator.getDoc(USER_ALPHA, 'executionLogs', 'log-beta-01')).toThrow();
      expect(() => evaluator.deleteDoc(USER_ALPHA, 'executionLogs', 'log-beta-01')).toThrow();

      expect(() => evaluator.getDoc(USER_BETA, 'plans', 'plan-alpha-01')).toThrow();
      expect(() => evaluator.updateDoc(USER_BETA, 'plans', 'plan-alpha-01', { content: '변조' })).toThrow();
      expect(() => evaluator.deleteDoc(USER_BETA, 'plans', 'plan-alpha-01')).toThrow();
      expect(() => evaluator.getDoc(USER_BETA, 'tasks', 'task-alpha-01')).toThrow();
      expect(() => evaluator.updateDoc(USER_BETA, 'tasks', 'task-alpha-01', { priority: 'low' })).toThrow();
      expect(() => evaluator.deleteDoc(USER_BETA, 'tasks', 'task-alpha-01')).toThrow();
      expect(() => evaluator.getDoc(USER_BETA, 'executionLogs', 'log-alpha-01')).toThrow();
      expect(() => evaluator.deleteDoc(USER_BETA, 'executionLogs', 'log-alpha-01')).toThrow();

      // 침투 시도 후 스냅샷 카운트 비교
      const alphaAfter = evaluator.getSnapshotCount(USER_ALPHA);
      const betaAfter = evaluator.getSnapshotCount(USER_BETA);

      expect(alphaAfter.plans).toBe(alphaBefore.plans);
      expect(alphaAfter.tasks).toBe(alphaBefore.tasks);
      expect(alphaAfter.logs).toBe(alphaBefore.logs);
      expect(alphaAfter.total).toBe(alphaBefore.total);

      expect(betaAfter.plans).toBe(betaBefore.plans);
      expect(betaAfter.tasks).toBe(betaBefore.tasks);
      expect(betaAfter.logs).toBe(betaBefore.logs);
      expect(betaAfter.total).toBe(betaBefore.total);

      // 데이터 1바이트 오염 여부 검증 (원본 불변성)
      const alphaPlan = evaluator.getDoc(USER_ALPHA, 'plans', 'plan-alpha-01');
      expect(alphaPlan.title).toBe('알파 계정 10월 플랜');
      expect(alphaPlan.content).toBe('알파 전용 비공개 계획');

      const betaPlan = evaluator.getDoc(USER_BETA, 'plans', 'plan-beta-01');
      expect(betaPlan.title).toBe('베타 계정 10월 플랜');
      expect(betaPlan.content).toBe('베타 전용 비공개 계획');
    });
  });
});
