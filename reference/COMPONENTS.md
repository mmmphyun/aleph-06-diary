# COMPONENTS.md — 컴포넌트 규격 및 구현 명세서

> **에이전트 주의사항 (Harness Guide)**:  
> 본 문서는 [M1] 골격 및 [M2] 계획/물리 인터랙션 구현 컴포넌트의 공식 인터페이스 및 시각 규격을 규정합니다.  
> [M3]~[M6]으로 표기된 컴포넌트는 해당 마일스톤 진입 전까지 코드를 작성하지 마십시오.

---

## 1. [M1/M2 구현 완료] 바인더 섀시, 표지 및 계획/타임라인

### 1.1 바인더 섀시 및 네비게이션
* **`BinderChassis`**:
  * 규격: 960×640px (1.5:1 가로형 양장 바인더 고정).
  * 외형: 하드커버 4px 테두리, 테마별 커버 배경색(`var(--color-cover)`), 바인더 외부 그림자(`shadows.chassis`).
  * 물리 개폐 상태 머신 (`phase`):
    * `closed`: Frame 0 닫힘 (좌: 데스크 메모지, 우: 닫힌 앞표지).
    * `opening-cover` ➔ `cover-opened`: Frame 1 표지 열림 (좌: 인사이드 커버 소유자 서명, 우: LEAF 01 표제지 수동 대기).
    * `leaf-flipping` ➔ `opened`: Frame 2 내지 플립 및 Frame 3 양면 본문 안착.
    * `closing-leaf` ➔ `closing-cover` ➔ `closed`: 역방향 순차 닫기.
  * **불변식**: 자동 연쇄 타이머(`setTimeout`) 완전 폐지, 2회의 명시적 수동 사용자 클릭(1: 표지 열기, 2: 다음 장 넘기기)에 의해서만 단계 전이.
* **`SpineDivider`**:
  * 중앙 16px 폭 제본선 그라디언트 + 인셋 깊이감 그림자(`shadows.spineCrease`).
* **`PersonalizationToolbar`**:
  * 바인더 상단 모서리 미니멀 툴바 (`[🎨 테마 ▾] [✏️ 펜: 일반 ▾]`).
  * 4종 색상 테마 및 3종 손글씨 폰트 전환 제어 (`localStorage` 연동).

### 1.2 View 0: 표지 및 인사이드 커버 (`CoverView`)
* **규격**: 480×640px, 양면 3D 회전 카드 (`transform-origin: left center`, `rotateY(-180deg)`).
* **앞면 (Front Cover)**:
  * 다크 톤 하드커버, 우측 라운딩 모서리.
  * 상단: `PLAN-DO-SEE DIARY` 음각 영문 타이틀.
  * 중앙: 정밀 2px 메탈 라인 잠금쇠(`OpenPadlockIllustration`, `LockKeyholeOpen`).
  * 필수 안내 포스트잇(`NoticeMemoSticky`): 페일 옐로우 포스트잇, T06-C82 필수 안내문 + `"다이어리 열기 →"` 수동 버튼.
* **뒷면 (Inside Cover - 다이어리 소유자 서명란)**:
  * 180도 회전 시 좌측에 안착하는 하드커버 안쪽 면.
  * 라벨: `"THIS DIARY BELONGS TO:"` (`font-mono text-stone-400 text-xs`).
  * 서명란: 단선 언더라인 스타일 + `font-handwriting` 손글씨 폰트.
  * 영구 보존: 브라우저 `localStorage.getItem('diary_owner_name')` / `setItem` 실시간 바인딩.
  * 우측 상단: 실수로 표지만 열었을 때 복귀 가능한 `[ 표지 닫기 ]` 액션 버튼(`onClose`).

### 1.3 View 2: 계획 카드 (`PlanCard`)
* **규격**: 좌측 480×640px 양장 속지 면 (`var(--color-paper)`).
* **스큐어모피즘 원칙**:
  * **팝업 모달 다이얼로그 전면 폐지**: SaaS 플로팅 모달 배제.
  * **줄노트 인라인 편집 폼(Inline Form)**: `isEditing` 토글 시 줄노트 위에서 직접 만년필로 적는 인라인 폼으로 전환.
* **타이포그래피 스코핑**:
  * 계획 제목, 성공 기준 목록, 인라인 수정 필드: `font-handwriting` 손글씨 폰트 강제 적용.
  * 시스템 메타/버튼: `font-sans`(Pretendard), 날짜/숫자: `font-mono`.
* **주요 구성**:
  * 상단: 계획 뷰 라벨, 우선순위 배지, `[계획 수정]` 토글 버튼.
  * 메타 바: 계획 기간(`period.start ~ period.end`), 예상 총 시간(`estimatedHours`).
  * 성공 기준 줄노트 리스트 (h-[240px]): 가로선 배경(`bg-ruled-lines`) 위 체크박스 토글 + 손글씨 텍스트. 스크롤바를 배제하고 책 메타포를 준수하는 5건 단위 무스크롤 쪽 넘김(Pagination) 적용.
  * 인라인 편집 모드: 제목 인라인 언더라인 인풋 + 우선순위/시간/종료일 컨트롤 + 성공 기준 항목별 인라인 수정/추가/삭제 (5건 단위 쪽 넘김 동일 적용).

### 1.4 View 2: 수정 이력 타임라인 (`RevisionTimeline`)
* **규격**: 우측 480×640px 양장 속지 면.
* **주요 구성**:
  * 5건 단위 페이징 무스크롤 타임라인 (`planService.getPlanRevisions(planId, page, 5)`).
  * 변경 전 값 취소선(`line-through`) 및 변경 후 값 대조 인라인 렌더링.
  * 상하단 페이지네이션 인덱스(`PAGE X OF Y`) 및 이전/다음 탐색 버튼.

### 1.5 3대 공통 정적 상태 피드백
* **`EmptyState`**: 깨끗한 빈 모눈종이 배경 + 연필 드로잉 아이콘 + `"아직 작성된 계획이 없습니다"` 안내 및 CTA.
* **`LoadingState` (Nib Pulse)**: 만년필 닙 좌우 흔들림 애니메이션 + `"기록 중..."` 인디케이터.
* **`ErrorState` (Coffee Splash)**: 반투명 커피 링 워터마크 배경 + 고대비 에러 박스 및 재시도 버튼.

---

## 2. [M3~M6 예정] 후속 마일스톤 구현 대상

> ⚠️ **M3 이전에는 아래 컴포넌트를 구현하거나 import하지 마십시오.**

### [M3 - 할 일 다루기]
* **`TaskFilterBar`**: 검색창, 상태/우선순위/마감일 필터 셀렉터.
* **`SortAnnouncementBanner`**: 필수 문구(T06-C20) 공시 배너.
* **`TaskCard`**: 할 일 카드 (상태 토글 스티커, 마감일, 태그 칩, `+기록`, 삭제 버튼).

### [M4 - 실행 기록]
* **`LogRecordDialog`**: 인라인/드로어 형태 실행 기록 폼 (시작/종료 시각, 소요 시간, 막혔던 이유).

### [M5 - 돌아보기]
* **`DateRangePicker`**: 기간 선택 팝오버.
* **`MetricGrid`**: 4대 지표 2×2 카드 그리드.
* **`MetricDrilldown`**: 우측 페이지 상세 목록 전환 렌더러.

### [M6 - 휴지통]
* **`TrashCard`**: 삭제된 항목 카드 (구겨진 음영 + 마스킹 테이프 + '복구' 버튼).
* **`TrashBanner`**: 7일 보관 후 영구 삭제 안내 문구.
