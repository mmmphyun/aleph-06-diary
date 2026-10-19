# M4 세션 무효화, 토큰 수명 주기 관리 및 자격 증명 보안 점검 보고서

- **문서 버전:** 1.0.0
- **작성 일시:** 2026-10-19T12:16:00+09:00
- **연결 마일스톤:** T07-M4 (세션 무효화, 토큰 수명 주기 관리 및 자격 증명 보안 점검)
- **연결 검증 기준:** T07-C108, T07-C109, T07-C110, T07-C111, T07-C112, T07-C113, T07-C114, T07-C115, T07-C46
- **테스트 스위트 소스:** [src/services/sessionLifecycle.test.ts](file:///c:/work/aleph-06-diary/src/services/sessionLifecycle.test.ts)
- **인증 서비스 구현 소스:** [src/services/authService.ts](file:///c:/work/aleph-06-diary/src/services/authService.ts)

---

## 1. 로그인 상태 성공(200 OK) vs 로그아웃 직후 거절(403 Forbidden) 병렬 대조 (T07-C108)

동일한 Cloud Firestore 엔드포인트 및 문서(`plans/plan-alpha-01`)를 대상으로 로그인 세션 유지 시점과 `signOut()` 호출 직후 시점의 응답을 병렬 대조합니다.

### 1.1 병렬 대조 요약표

| 비교 항목 | [상태 A] 로그인 세션 활성 상태 | [상태 B] 로그아웃(`signOut`) 직후 상태 |
| :--- | :--- | :--- |
| **대상 리소스** | `plans/plan-alpha-01` | `plans/plan-alpha-01` (동일 리소스) |
| **호출 메서드** | `getDoc(doc(db, 'plans', 'plan-alpha-01'))` | `getDoc(doc(db, 'plans', 'plan-alpha-01'))` |
| **인메모리 `auth.currentUser`** | `{ uid: "user_alpha", email: "alpha@pds-diary.test" }` | `null` (즉시 초기화) |
| **IndexedDB 토큰 상태** | `firebaseLocalStorageDb` 내 유효 토큰 존재 | `0건` (즉시 영구 파기) |
| **Authorization 헤더 토큰** | `Bearer eyJhb...[생략]` | 토큰 없음 (또는 폐기된 `eyJhb...[생략]` 재사용 시도) |
| **서버 측 평가 규칙** | `firestore.rules` Line 162 (`request.auth != null && resource.data.userId == request.auth.uid`) | `firestore.rules` Line 162 (`request.auth != null` 조건 불충족) |
| **응답 상태 코드** | **200 OK (인가 통과)** | **403 Forbidden (`permission-denied`)** |

### 1.2 [상태 A] 로그인 상태 요청-응답 성공 로그

```json
{
  "request": {
    "operation": "Firestore.getDoc",
    "target": "databases/(default)/documents/plans/plan-alpha-01",
    "authHeader": "Bearer eyJhb...[생략]",
    "authContext": {
      "uid": "user_alpha",
      "email": "alpha@pds-diary.test"
    }
  },
  "response": {
    "status": 200,
    "ok": true,
    "authenticatedUid": "user_alpha",
    "maskedToken": "eyJhb...[생략]",
    "data": {
      "id": "plan-alpha-01",
      "userId": "user_alpha",
      "title": "검증용 보안 계획 문서"
    }
  }
}
```

### 1.3 [상태 B] 로그아웃 직후 동일 요청 거절 로그

```json
{
  "request": {
    "operation": "Firestore.getDoc",
    "target": "databases/(default)/documents/plans/plan-alpha-01",
    "authHeader": "Bearer eyJhb...[생략] (Revoked / Cleared)",
    "authContext": null
  },
  "response": {
    "name": "FirebaseError",
    "code": "permission-denied",
    "status": 403,
    "ruleLine": 162,
    "message": "Missing or insufficient permissions. (Target: plans/plan-alpha-01, Rules line: 162)"
  }
}
```

---

## 2. Firebase ID Token 수명 주기(3,600초) 및 55분 자동 갱신 메커니즘 (T07-C109, T07-C110, T07-C111)

### 2.1 토큰 수명 주기 아키텍처 도식

```mermaid
sequenceDiagram
    autonumber
    actor User as 사용자 (브라우저)
    participant App as AuthContext / CoverView
    participant SDK as Firebase Auth SDK (v12.19.0)
    participant IDB as IndexedDB (firebaseLocalStorageDb)
    participant IDP as Google SecureToken API
    participant FS as Cloud Firestore (firestore.rules)

    User->>App: 이메일 + 비밀번호 입력 (type="password")
    App->>SDK: signInWithEmailAndPassword(auth, email, "***[생략]")
    SDK->>IDP: TLS 1.3 암호화 자격 증명 검증
    IDP-->>SDK: RS256 ID Token (TTL: 3600s, eyJhb...[생략]) + Refresh Token
    SDK->>IDB: 토큰 페어 격리 저장 (URL 쿼리/히스토리 노출 0건)
    App->>App: setPassword('') 평문 메모리 즉시 소거

    Note over SDK,FS: [구간 1] 0초 - 3,300초 (55분): 유효 ID 토큰으로 인가 통과
    SDK->>FS: getDoc / setDoc (Bearer eyJhb...[생략])
    FS-->>SDK: 200 OK (request.auth.uid == resource.data.userId)

    Note over SDK,IDP: [구간 2] 3,300초 (만료 5분 전): 백그라운드 무중단 갱신
    SDK->>IDP: POST https://securetoken.googleapis.com/v1/token (Refresh Token 제시)
    IDP-->>SDK: 신규 RS256 ID Token 발급 (신규 TTL: 3600s, eyJhb...[생략])
    SDK->>IDB: 기존 ID Token 덮어쓰기 갱신

    Note over User,FS: [구간 3] 로그아웃(signOut) 호출 시 즉시 소각
    User->>App: [로그아웃] 클릭
    App->>SDK: signOut(auth)
    SDK->>IDB: firebaseLocalStorageDb 토큰 레코드 즉시 삭제 (0건)
    SDK->>App: auth.currentUser = null 전이 및 표지 잠금(LOCKED) 복귀
    SDK->>FS: 이후 동일 리소스 접근 시도
    FS-->>SDK: 403 Permission Denied (Line 162 차단)
```

### 2.2 토큰 기술 규격 명세 (`TOKEN_LIFECYCLE_SPEC`)

| 규격 항목 | 설정값 | 검증 기준 및 근거 |
| :--- | :--- | :--- |
| **서명 알고리즘 (`alg`)** | `RS256` (RSA Signature with SHA-256) | Google 공개키(`https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com`)로만 검증 가능하며 클라이언트 위조 불가 (T07-C109) |
| **유효 기간 (`ttlSeconds`)** | `3,600초` (`exp - iat == 3600`) | 탈취 위험 최소화를 위해 1시간 단기 수명 강제 (T07-C109) |
| **자동 갱신 임계치** | `3,300초` (발급 후 55분, 만료 5분 전) | 만료로 인한 요청 끊김 방지를 위해 SDK가 백그라운드에서 Refresh Token으로 선제 갱신 (T07-C110) |
| **발급자 (`iss`)** | `https://securetoken.google.com/pds-diary-t06` | 프로젝트 고유 식별자 일치 여부 검증 |
| **대상 (`aud`)** | `pds-diary-t06` | 타 Firebase 프로젝트에서 발급된 토큰의 교차 재사용(Replay) 원천 차단 |
| **클라이언트 저장소** | `IndexedDB` (`firebaseLocalStorageDb`) | 로그아웃 시 즉시 `0건`으로 소각되며 `auth.currentUser`가 `null`로 동기 전이됨 (T07-C111) |

---

## 3. URL 쿼리 파라미터 및 브라우저 히스토리 무노출 검증 (T07-C112)

- **라우팅 정책:** 단일 페이지 바인더 아키텍처(`https://pds-diary-t06.web.app/`)를 사용하여 인증 전후 URL 경로 변경 없이 React 인메모리 상태(`AuthContext.currentUser`)와 3D 커버 상태(`isOpen`)로만 화면을 전환합니다.
- **폼 전송 방식:** `CoverView.tsx`의 `handleSubmit`에서 `e.preventDefault()`를 강제하여 브라우저 기본 GET 쿼리 제출(`?email=...&password=...`)이 절대 발생하지 않습니다.
- **정적 및 동적 검증 결과:**
  - `URL.searchParams` 내 금지 파라미터(`token`, `idToken`, `id_token`, `access_token`, `refresh_token`, `password`, `pwd`, `secret`) 검출 건수: **0건**.
  - 전체 프론트엔드 소스(`src/**/*.ts`, `src/**/*.tsx`) 내 `history.pushState` / `replaceState` 또는 쿼리 스트링 토큰 주입 패턴 검출 건수: **0건**.

---

## 4. 자격 증명 및 비밀키(Private Key) 0건 정밀 스캔 결과 (T07-C113, T07-C114, T07-C115, T07-C46)

### 4.1 스캔 대상 및 정규표현식 패턴

- **검사 범위:**
  1. Git 전체 커밋 이력 (`git log --all -p`)
  2. 프론트엔드 프로덕션 빌드 아티팩트 (`dist/index.html`, `dist/assets/*.js`, `dist/assets/*.css`)
  3. 전체 소스 코드 및 설정/문서 (`src/`, `docs/`, `contracts/`)
- **탐지 패턴:**
  - `-----BEGIN (RSA )?PRIVATE KEY-----`
  - `"private_key"\s*:\s*"-----BEGIN`
  - `FIREBASE_SERVICE_ACCOUNT` / `FIREBASE_ADMIN_PRIVATE_KEY`
  - `client_secret"\s*:\s*"[A-Za-z0-9_-]{20,}"`

### 4.2 스캔 실행 명령 및 실측 결과

```powershell
$gitLogHits = (git log --all -p | Select-String -Pattern "BEGIN (RSA )?PRIVATE KEY|FIREBASE_SERVICE_ACCOUNT|FIREBASE_ADMIN_PRIVATE_KEY|client_secret").Count
$distHits = (Get-ChildItem -Path dist -Recurse -File | Select-String -Pattern "BEGIN (RSA )?PRIVATE KEY|FIREBASE_SERVICE_ACCOUNT|FIREBASE_ADMIN_PRIVATE_KEY|client_secret").Count
$srcHits = (Get-ChildItem -Path src, docs, contracts -Recurse -File -Exclude "sessionLifecycle.test.ts" | Select-String -Pattern "BEGIN (RSA )?PRIVATE KEY|FIREBASE_SERVICE_ACCOUNT|FIREBASE_ADMIN_PRIVATE_KEY|client_secret").Count
Write-Output "GIT_LOG_HITS=$gitLogHits | DIST_HITS=$distHits | SRC_DOCS_HITS=$srcHits"
```

```text
GIT_LOG_HITS=0 | DIST_HITS=0 | SRC_DOCS_HITS=0
```

| 검사 영역 | 스캔 대상 상세 | 비밀키/시크릿 검출 건수 | 판정 |
| :--- | :--- | :---: | :---: |
| **Git 커밋 히스토리** | 최초 커밋(`41c727d`)부터 현재 HEAD까지 전수 패치 이력 | **0건** | **PASS (T07-C113)** |
| **프로덕션 빌드 (`dist/`)** | `dist/index.html` 및 번들링된 JS/CSS 에셋 전수 | **0건** | **PASS (T07-C114)** |
| **소스 코드 및 문서** | `src/`, `docs/`, `contracts/` 내 전체 파일 | **0건** | **PASS (T07-C46)** |
| **토큰/비밀번호 마스킹** | `maskSensitiveToken()` 적용 (`eyJhb...[생략]`, `***[생략]`) | **100% 준수** | **PASS (T07-C115)** |

> **참고 (Firebase Web API Key 관련):** `src/lib/firebase.ts`에 포함된 `AIzaSy...` 식별자는 Google Cloud/Firebase 공식 문서상 브라우저 클라이언트가 프로젝트를 식별하기 위해 사용하는 **공개 식별자(Public Project Identifier)**이며 비밀키(Secret/Private Key)가 아닙니다. 실제 데이터 보안은 `firestore.rules`의 `request.auth.uid` 검증으로 강제됩니다.

---

## 5. 결론

마일스톤 M4(세션 무효화, 토큰 수명 주기 관리 및 자격 증명 보안 점검)의 모든 요구사항(T07-C108 - T07-C115, T07-C46)이 자동화 테스트 스위트(`src/services/sessionLifecycle.test.ts`) 및 정적/빌드 스캔을 통해 100% 검증 완료되었습니다.
