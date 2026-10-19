# 플랜두씨 다이어리 (PDS Diary) - 과제 7

> 아날로그 6공 바인더의 촉각적 경험(480×640px 무스크롤, 양면 스프레드, 3D 표지 회전)을 그대로 구현한 웹 기반 플래닝 & 회고 애플리케이션입니다.

- **프로덕션 배포 URL:** [https://pds-diary-t06.web.app](https://pds-diary-t06.web.app)
- **인증 구현 보고서:** [docs/t07-auth-report.md](docs/t07-auth-report.md)
- **5일 관찰 및 지표 대조 보고서:** [docs/t07-five-day-observation.md](docs/t07-five-day-observation.md)
- **IDOR 양방향 침투 방어 증적:** [docs/t07-idor-defense-evidence.md](docs/t07-idor-defense-evidence.md)
- **세션 및 자격증명 보안 점검:** [docs/t07-token-lifecycle-and-secrets.md](docs/t07-token-lifecycle-and-secrets.md)

---

## [필수 제출 단축 양식]

### 1. 짧은 확인 방법 4줄 (T07-C39)
1. **어디로 가나요**: 웹 브라우저(시크릿 창 권장)에서 프로덕션 배포 주소 [https://pds-diary-t06.web.app](https://pds-diary-t06.web.app) 에 접속합니다.
2. **세 단계 안에 무엇을 하나요**: 
   - 1단계: 첫 화면 닫힌 바인더 잠금쇠 표지에서 [회원가입] 탭을 누르고 이메일/비밀번호(6자 이상)를 입력하여 가입합니다.
   - 2단계: 자동 로그인과 동시에 3D 표지 회전 애니메이션이 격발되며 다이어리 본문(Leaf 01 목차)으로 진입합니다.
   - 3단계: 상단 탭에서 [플랜(Plan)] 또는 [보관함(Archive)]을 눌러 본인 고유의 계획 패키지를 작성·조회하고 [로그아웃]을 수행합니다.
3. **무엇이 보이면 통과인가요**: 
   - 로그인 직후 본인 소유의 5일 관찰 실데이터와 지표(15건 계획, 11건 완료, 73.3% 완료율)가 정상 노출되고, 타인 계정이나 미인증 상태에서는 잠금 표지 차단 및 Firestore 403 Permission Denied가 발생하여 데이터 유출이 0건이면 통과입니다.
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

## 핵심 검증 요약

- **인증 솔루션**: Firebase Authentication Email/Password (v12.19.0, RS256 JWT, TTL 3,600s, scrypt 해싱)
- **보안 경계**: Cloud Firestore Security Rules 소유자 완전 격리 (`resource.data.userId == request.auth.uid`)
- **테스트 커버리지**: 10개 테스트 파일, 89개 테스트 케이스 전수 통과 (Duration: ~770ms)
- **정적 분석**: TypeScript strict (`tsc --noEmit`) 0건 에러
- **비밀값 보존**: Git 전체 히스토리 및 빌드 번들 내 비밀키 노출 0건
