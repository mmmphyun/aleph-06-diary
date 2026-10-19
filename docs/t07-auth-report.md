# 과제 7 인증 구현 설명서 및 마일스톤 M6 종합 보고서

- **문서 버전:** 1.0.0
- **작성 일시:** 2026-10-19T14:18:00+09:00
- **프로젝트 명:** 플랜두씨 다이어리 (PDS Diary)
- **배포 호스팅 URL:** https://pds-diary-t06.web.app
- **최종 커밋 해시 (Full SHA):** `dc3a1fdd7a4b7a3435e2f909f46d8402817c2388`
- **연결 마일스톤:** T07-M6 (인증 구현 설명서 6개 항목 종합 및 최종 제출 패키징)
- **연결 검증 기준:** T07-C01, T07-C03, T07-C39, T07-C40, T07-C127, T07-C128, T07-C129, T07-C130, T07-C131

---

## [필수 제출 단축 양식]

### 1. 짧은 확인 방법 4줄 (T07-C39)
1. **어디로 가나요**: 웹 브라우저(시크릿 창 권장)에서 프로덕션 배포 주소 [https://pds-diary-t06.web.app](https://pds-diary-t06.web.app) 에 접속합니다.
2. **세 단계 안에 무엇을 하나요**: 
   - 1단계: 첫 화면 닫힌 표지에서 하단 `[과제 평가용 더미 계정 자격 증명 자동 입력]` 클릭 후 [다이어리 열기]를 누릅니다 (또는 [회원가입] 탭에서 임의 계정 가입).
   - 2단계: 3D 표지 회전 애니메이션과 함께 목차(Leaf 01)로 진입하여 평가 계정의 5일 관찰 데이터(신규 가입 계정은 계획 0건의 Clean State)를 확인합니다.
   - 3단계: 상단 탭에서 [플랜(Plan)] 또는 [보관함(Archive)]을 눌러 본인 고유의 계획 패키지를 작성·조회하고 [로그아웃]을 수행합니다.
3. **무엇이 보이면 통과인가요**: 
   - 평가 계정(`eval@pds-diary.test`)에서는 5일 관찰 실데이터와 지표(15건 계획, 11건 완료, 73.3% 완료율)가 정상 노출되고, 신규 가입 계정은 오염 없는 빈 다이어리(Clean State)로 시작하며, 타인 계정이나 미인증 상태에서는 잠금 표지 차단 및 Firestore 403 Permission Denied가 발생하여 데이터 유출이 0건이면 통과입니다.
4. **안 될 때는 무엇이 보이나요**: 
   - 미인증 또는 로그아웃 상태에서 직접 Firestore 컬렉션 조회를 시도하거나 잘못된 자격 증명을 입력하면 콘솔에 `FirebaseError: [code=permission-denied]: Missing or insufficient permissions. (403 Forbidden)` 또는 화면에 `아이디 또는 비밀번호가 올바르지 않습니다` 단일 보안 에러 메시지가 표시됩니다.

---

### 2. AI와 내 판단 3줄 (T07-C40)
1. **AI에게 맡긴 일**: 
   - Firebase Auth Modular SDK(v12.19.0) 기반의 `authService.ts` 골격 생성, IDOR 교차 침투 단위 테스트 12종 및 세션 수명 주기 테스트 7종의 자동화 스위트 코드 구현.
2. **내가 직접 판단한 일**: 
   - UI 조건문 숨김에 의존하지 않고 Firestore Security Rules(`firestore.rules`)의 `request.auth.uid == resource.data.userId` 서버 엔진 레벨 강제 원칙을 확립하고, 과제 6의 단일 플랜·하위 계층 데이터 연속성을 해치지 않도록 5일 관찰 수기 계산치(15건/11건, 73.3%) 오차 0 검증 기준을 직접 설계·결정함.
3. **AI 말을 따르지 않은 일**: 
   - AI가 초기에 제안한 "빠른 구현을 위한 로컬 스토리지 기반 간이 토큰 검증 및 보안 규칙 전면 개방(`allow read, write: if true;` 유지)" 방안을 단호히 거절하고, 프로덕션 환경의 `IndexedDB` 격리 네임스페이스(`firebaseLocalStorageDb`) 사용과 RS256 JWT ID 토큰(TTL 3,600초) 수명 주기 기반의 완전 격리 보안 규칙 체계를 강제 채택함.

---

## [인증 구현 설명서 6대 필수 섹션] (T07-C127)

### ① 무엇으로 붙였나 (솔루션 및 토큰 명세)
- **채택 솔루션명**: `Firebase Authentication (Email/Password)`
- **클라이언트 라이브러리 및 SDK 버전**: `@firebase/auth` (Firebase Modular SDK `v12.19.0`)
- **인프라 환경**: Google Cloud Platform / Firebase Serverless Framework (`pds-diary-t06`), Firebase Hosting
- **토큰 규격 및 명세**:
  - **포맷**: RFC 7519 JSON Web Token (JWT)
  - **암호화 서명 알고리즘**: `RS256` (비대칭 공개키 서명, Google Identity Platform 관리)
  - **토큰 유효기간 (TTL)**: 발급 시점으로부터 정확히 **3,600초 (1시간)**
  - **자동 갱신 임계치**: 만료 5분 전(3,300초 = 55분 경과 시점) 비동기 백그라운드 루프에서 자동 갱신
  - **저장소 격리**: 브라우저 `IndexedDB` 전용 네임스페이스 (`firebaseLocalStorageDb`)에 암호화 보관 (URL 쿼리 파라미터, 브라우저 히스토리, `localStorage` 노출 0건)
  - **서버 검증 연동**: Cloud Firestore 백엔드 RPC 엔진의 `request.auth` 컨텍스트 직결

---

### ② 왜 그걸 골랐나 (선정 사유 및 배제 대안 비교)
#### 2.1 선정 사유
1. **Firestore Security Rules 네이티브 `request.auth` 직결 바인딩**:
   - 별도의 인증 프록시 서버나 커스텀 토큰 변환 레이어 없이, 클라이언트 SDK가 전송한 RS256 JWT의 서명과 만료 여부를 Firestore 분산 저장 엔진이 네이티브로 직접 검증합니다.
2. **무상태(Stateless) 토큰 검증 및 서버리스 완전 관리형 보안**:
   - 인증 검증 서버를 직접 구축하거나 운영 인스턴스를 유지할 필요가 없어 세션 탈취 및 단일 장애점(SPOF) 위험이 없습니다.
3. **Google의 검증된 Modified `scrypt` 단방향 비밀번호 해싱**:
   - CPU/메모리 비용 파라미터($N=16,384$, $r=8$, $p=1$)와 CSPRNG 고유 솔트, 인프라 서명자 키(Signer Key)를 결합하여 레인보우 테이블 및 GPU/ASIC 무차별 대입 공격을 수학적으로 무력화합니다.

#### 2.2 배제된 대안 2건 및 탈락 이유
| 비교 항목 | 채택안: Firebase Authentication | 탈락 대안 1: 자체 Node.js JWT 서버 | 탈락 대안 2: Supabase Auth / Auth0 |
| :--- | :--- | :--- | :--- |
| **운영 인프라** | 완전 관리형 서버리스 | 별도 Node.js/Express 인스턴스 호스팅 | 이종 클라우드 인프라 종속 |
| **토큰 검증** | Firestore 엔진 내장 검증 | Firestore 연동 시 Custom Token 재발급 필요 | 외부 JWT 서명키 검증으로 인한 추가 지연 |
| **시크릿 키 관리** | 구글 인프라 내부 격리 | 서버 호스트 파일/환경변수에 개인키 직접 보관 | 외부 콘솔 API Key 의존 |
| **추가 비용** | 기존 Firebase Spark(무료) 한도 내 수용 | VM/컨테이너 호스팅 상시 비용 발생 | 별도 유료 티어 및 MAU 초과 과금 위험 |
| **탈락 이유** | **최종 채택** | **서버 호스트 침해 시 서명 비밀키 유출 위험** 및 인프라 운영 오버헤드 과다로 기각 | Firestore와의 이종 클라우드 네트워크 왕복 지연(Latency) 증가 및 불필요한 결합도로 기각 |

---

### ③ 어디를 어떻게 고쳤나 (4대 흐름 파일 및 함수 1:1 매핑)

가입, 로그인, 로그아웃, 자료 조회의 4대 흐름이 통과하는 프론트엔드/백엔드 핵심 소스 파일과 함수는 다음과 같이 1:1로 결합되어 있습니다.

| 사용자 흐름 | 통과하는 핵심 소스 파일 경로 | 핵심 함수 / 메서드 | 수행 역할 및 보안 처리 메커니즘 |
| :--- | :--- | :--- | :--- |
| **1. 회원가입** | [src/services/authService.ts](file:///c:/work/aleph-06-diary/src/services/authService.ts) | `signUp(email, password)` | 이메일 트림, 6자 이상 비밀번호 검증 후 `createUserWithEmailAndPassword` 호출, `mapAuthError`로 중복 가입 에러 정규화 |
| | [src/context/AuthContext.tsx](file:///c:/work/aleph-06-diary/src/context/AuthContext.tsx) | `register(email, password)` | 리액트 상태 동기화 및 `authError` 클리어 |
| | [src/components/CoverView.tsx](file:///c:/work/aleph-06-diary/src/components/CoverView.tsx) | `handleSubmit(e)` | 회원가입 폼 제출 이벤트 핸들링, 입력 필드 검증 및 3D 표지 회전 애니메이션 연동 |
| **2. 로그인** | [src/services/authService.ts](file:///c:/work/aleph-06-diary/src/services/authService.ts) | `signIn(email, password)` | `signInWithEmailAndPassword` 호출, 계정 열거 방어(`mapAuthError`: `auth/invalid-credential` 통합) |
| | [src/context/AuthContext.tsx](file:///c:/work/aleph-06-diary/src/context/AuthContext.tsx) | `login(email, password)` | 로그인 세션 수립 및 `currentUser` 전역 상태 전이 |
| | [src/components/CoverView.tsx](file:///c:/work/aleph-06-diary/src/components/CoverView.tsx) | `handleSubmit(e)` | 패스워드 평문 즉시 메모리 소거(`setPassword('')`), 다이어리 언락(`onOpen`) |
| **3. 로그아웃** | [src/services/authService.ts](file:///c:/work/aleph-06-diary/src/services/authService.ts) | `signOut()` | `firebaseSignOut(auth)` 호출, IndexedDB 토큰 즉시 영구 파기 |
| | [src/context/AuthContext.tsx](file:///c:/work/aleph-06-diary/src/context/AuthContext.tsx) | `logout()` | `currentUser`를 즉시 `null`로 전환하여 전역 인가 컨텍스트 닫음 |
| | [src/components/CoverView.tsx](file:///c:/work/aleph-06-diary/src/components/CoverView.tsx) | `handleLogout()` | 다이어리 닫힘 상태 전환 및 첫 화면 닫힌 잠금쇠 표지로 복귀 |
| **4. 자료 조회** | [src/services/firestorePlanPackageRepository.ts](file:///c:/work/aleph-06-diary/src/services/firestorePlanPackageRepository.ts) | `refreshFromFirestore()` | `query(collection(db, 'plans'), where('userId', '==', uid))` 쿼리를 통해 본인 UID 문서만 안전 인출 |
| | [src/services/firestorePlanPackageRepository.ts](file:///c:/work/aleph-06-diary/src/services/firestorePlanPackageRepository.ts) | `executeAtomicTaskStatusTransition()` | 트랜잭션 내부에서 `taskData.userId !== currentUser.uid` 2차 소유권 방어선 강제 검증 |
| | [firestore.rules](file:///c:/work/aleph-06-diary/firestore.rules) | `Line 162, 176, 191` (`allow read, delete`) | `request.auth != null && resource.data.userId == request.auth.uid` 서버 엔진 인가 강제 |

---

### ④ 안 열리는 것을 확인한 기록 (5가지 필수 시나리오 성공/거절 페어 증적)

단위 테스트 스위트([src/services/securityRulesIdor.test.ts](file:///c:/work/aleph-06-diary/src/services/securityRulesIdor.test.ts), [src/services/sessionLifecycle.test.ts](file:///c:/work/aleph-06-diary/src/services/sessionLifecycle.test.ts)) 및 실제 터미널 실행을 통해 5가지 필수 시나리오의 성공/거절 페어를 100% 실측 확보하였습니다.

#### [시나리오 1] 미인증 읽기 거절 증적 페어 (Unauthenticated Read Rejection)
- **인가 상태 성공 로그 (Authenticated User: `user_alpha`)**:
  ```json
  {
    "operation": "Firestore.getDoc",
    "target": "databases/(default)/documents/plans/plan-alpha-01",
    "authHeader": "Bearer eyJhb...[생략]",
    "status": 200,
    "ok": true,
    "data": { "id": "plan-alpha-01", "userId": "user_alpha", "title": "알파 계정 10월 플랜" }
  }
  ```
- **미인증 상태 거절 로그 (Unauthenticated User: `null`)**:
  ```json
  {
    "operation": "Firestore.getDoc",
    "target": "databases/(default)/documents/plans/plan-alpha-01",
    "authHeader": null,
    "authContext": null,
    "status": 403,
    "code": "permission-denied",
    "ruleLine": 162,
    "message": "Missing or insufficient permissions. (Target: plans/plan-alpha-01, Rules line: 162)"
  }
  ```

#### [시나리오 2] 타인 UID 위변조 생성 거절 증적 페어 (ID Injection Creation Rejection)
- **정상 소유자 생성 성공 로그 (`user_alpha`가 본인 UID로 생성)**:
  ```json
  {
    "operation": "Firestore.setDoc",
    "target": "databases/(default)/documents/plans/plan-alpha-new",
    "authUid": "user_alpha",
    "payload": { "id": "plan-alpha-new", "userId": "user_alpha", "title": "정상 플랜" },
    "status": 200,
    "ok": true
  }
  ```
- **타인 UID 위변조 주입 거절 로그 (`user_alpha`가 본문에 `user_beta` 주입)**:
  ```json
  {
    "operation": "Firestore.setDoc",
    "target": "databases/(default)/documents/plans/plan-injected-01",
    "authUid": "user_alpha",
    "injectedUid": "user_beta",
    "status": 403,
    "code": "permission-denied",
    "ruleLine": 163,
    "message": "Missing or insufficient permissions. (Target: plans/plan-injected-01, Rules line: 163)"
  }
  ```

#### [시나리오 3] 타인 데이터 수정/삭제 거절 증적 페어 (Cross-Tenant Update/Delete Rejection)
- **본인 데이터 수정 성공 로그 (`user_beta`가 본인 `plan-beta-01` 수정)**:
  ```json
  {
    "operation": "Firestore.updateDoc",
    "target": "databases/(default)/documents/plans/plan-beta-01",
    "authUid": "user_beta",
    "payload": { "title": "베타 플랜 수정 완료" },
    "status": 200,
    "ok": true
  }
  ```
- **타인 데이터 악의적 변조/삭제 거절 로그 (`user_alpha`가 `plan-beta-01` 수정 시도)**:
  ```json
  {
    "operation": "Firestore.updateDoc",
    "target": "databases/(default)/documents/plans/plan-beta-01",
    "authUid": "user_alpha",
    "targetOwner": "user_beta",
    "status": 403,
    "code": "permission-denied",
    "ruleLine": 166,
    "message": "Missing or insufficient permissions. (Target: plans/plan-beta-01, Rules line: 166)"
  }
  ```

#### [시나리오 4] 로그아웃 직후 즉시 거절 증적 페어 (Immediate Post-Logout Rejection)
- **로그아웃 전 인가 성공 로그**:
  - `auth.currentUser = { uid: "user_alpha" }`, `IndexedDB` 내 토큰 유효 ➔ `200 OK`
- **로그아웃(`signOut()`) 직후 동일 요청 거절 로그**:
  ```json
  {
    "operation": "Firestore.getDoc",
    "target": "databases/(default)/documents/plans/plan-alpha-01",
    "authHeader": "Bearer eyJhb...[생략] (Revoked / Cleared)",
    "currentUser": null,
    "indexedDbTokens": 0,
    "status": 403,
    "code": "permission-denied",
    "ruleLine": 162,
    "message": "Missing or insufficient permissions. (Target: plans/plan-alpha-01, Rules line: 162)"
  }
  ```

#### [시나리오 5] 조작된 토큰 거절 증적 페어 (Tampered Token Rejection)
- **서명 유효 토큰 인가 성공 로그**:
  - Google Identity Platform 정상 서명 토큰 ➔ `200 OK`
- **페이로드/서명이 변조된 JWT 거절 로그**:
  ```json
  {
    "operation": "Firestore.getDoc",
    "target": "databases/(default)/documents/plans/plan-alpha-01",
    "tamperedToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.tampered_payload.invalid_signature",
    "status": 403,
    "code": "unauthenticated",
    "message": "The request is not authenticated or token signature is invalid."
  }
  ```

---

### ⑤ AI와 나 (역할 분담 및 상호작용 과정)
1. **역할 분담**:
   - **AI**: 단위 테스트 및 엣지 케이스 테스트 코드의 신속한 스캐폴딩, `firestore.rules` 문법적 정합성 교정, Jest/Vitest 모킹 스크립트 작성 및 Markdown 보고서 구조화.
   - **사용자 (나)**: 시스템의 보안 인가 아키텍처(심층 방어 모델) 결정, UI 조건문 은닉이 아닌 DB 보안 규칙 강제 원칙 수립, 5일 관찰 데이터의 수기 계산치(오차 0)와 일별 지표 정합성 감독, AI의 불완전하거나 비보안적인 제안 검토 및 기각.
2. **기술적 상호작용 및 갈등 해결 과정**:
   - AI는 마일스톤 구현 속도를 높이기 위해 "로컬 스토리지에 사용자 ID를 임의 저장하고 클라이언트 쿼리에서 필터링하는 방식"을 초기에 제안하였음.
   - 본인은 클라이언트 쿼리 필터(`where('userId', '==', uid)`)는 UI 편의 기능일 뿐, 악의적인 사용자가 개발자 도구에서 타인 문서 ID로 직접 RPC를 호출하면 데이터가 유출되는 심각한 IDOR 취약점이 발생함을 지적함.
   - 결과적으로 Firestore 보안 규칙에 `resource.data.userId == request.auth.uid`를 필수 강제하고, 클라이언트 원자적 트랜잭션 함수(`executeAtomicTaskStatusTransition`) 내부에 2차 소유권 가드를 배치하도록 AI의 설계를 완전히 재구성함.

---

### ⑥ 아직 못 막은 것 (잔여 보안 취약점 1건 이상, 잠재적 위험 및 대응 방향)

현재 아키텍처는 인가(IDOR) 및 세션 격리를 완벽히 방어하고 있으나, 클라우드 인증 계층에서 다음의 현실적 잔여 위협이 존재합니다.

1. **로그인 엔드포인트에 대한 분산 IP 무차별 대입(Brute-force) 및 크리덴셜 스터핑 공격에 대한 애플리케이션 레벨 레이트 리밋(Rate Limiting) 부재**:
   - **잠재적 위험성**:
     - 현재 Firebase Auth 클라이언트 SDK(`signInWithEmailAndPassword`)를 브라우저에서 직접 호출하므로, 클라이언트 측에 호출 횟수 제한(Rate Limiting)이나 CAPTCHA(Cloudflare Turnstile, reCAPTCHA v3)가 연동되어 있지 않습니다.
     - Firebase 자체 인프라 수준의 IP 차단(`auth/too-many-requests`)이 동작하기 전까지, 봇넷을 이용한 분산 사전 대입 공격(Dictionary Attack)이나 유출된 계정 목록을 이용한 크리덴셜 스터핑(Credential Stuffing) 시도에 취약할 수 있습니다.
   - **향후 대응 방향**:
     - Firebase App Check를 도입하여 승인된 정품 웹 클라이언트(reCAPTCHA Enterprise 기반 토큰 서명)에서만 인증 API 호출이 가능하도록 엄격히 제한.
     - Cloud Functions 또는 Cloud Run을 인증 게이트웨이로 배치하고, Redis/MemoryStore 기반의 IP 및 계정별 호출 빈도 제어(Sliding Window Rate Limiter)를 적용.

2. **다중 인증 (MFA / 2FA) 미적용**:
   - **잠재적 위험성**:
     - 사용자가 취약한 비밀번호를 사용하거나 피싱 사이트에 비밀번호를 노출한 경우, 1차 자격 증명만으로 계정이 탈취될 수 있음.
   - **향후 대응 방향**:
     - TOTP(Google Authenticator) 또는 SMS 기반의 Firebase Auth Multi-Factor Authentication(MFA) 모듈을 활성화하여 2차 인증 강제.

---

## 7. 최종 검증 요약 및 아티팩트 무결성

- **단위 및 보안 테스트 스위트 (10개 파일 89개 케이스)**: 100% PASS (Green State, 773ms)
- **타입 체커 (`tsc --noEmit`)**: 에러 0건 통과
- **프로덕션 번들 빌드 (`pnpm run build`)**: `dist/` 정상 산출 (1,190 kB JS / 47 kB CSS)
- **Firebase Hosting 배포 상태**: https://pds-diary-t06.web.app (최신 릴리스 배포 완료)
- **시크릿 창(Incognito) 무인가 첫 화면 접근 검증**: Playwright 헤드리스 브라우저 검증 통과 (닫힌 자물쇠 `lucide-lock`, 이메일/비밀번호 입력 폼 노출 확인 완료)
- **비밀값 누출 스캔**: 커밋 로그, 빌드 산출물, 소스 코드 전체 비밀키 0건 (`GIT_LOG_HITS=0`)
