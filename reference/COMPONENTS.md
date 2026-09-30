# COMPONENTS.md — 컴포넌트 규격 및 마일스톤별 구현 범위

> **에이전트 주의사항 (Harness Guide)**:  
> 본 문서는 전체 시스템의 컴포넌트 명세를 선반영하고 있으나, **현재 구현 대상은 [M1] 단계로 한정**됩니다.  
> [M2]~[M6]으로 표기된 컴포넌트는 해당 마일스톤 진입 전까지 코드를 작성하지 마십시오.

---

## 1. [M1 구현 대상] 섀시, 표지 및 공통 프레임

현재 마일스톤(M1)에서 반드시 구현해야 하는 다이어리 외형 및 표지 컴포넌트입니다.

### 1.1 바인더 섀시 및 툴바
* **`BinderChassis`**:
  * 규격: 960×640px (1.5:1 비율 고정).
  * 외형: 하드커버 4px 테두리, 테마별 커버 배경색, 바인더 외부 그림자(`shadows.chassis`).
* **`SpineDivider`**:
  * 중앙 16px 폭 제본선 그라디언트 + 인셋 깊이감 그림자(`shadows.spineCrease`).
* **`PersonalizationToolbar`**:
  * 바인더 상단 모서리 미니멀 툴바 (`[🎨 테마 ▾] [✏️ 펜: 일반 ▾]`).
  * 4종 색상 테마 및 3종 손글씨 폰트 전환 제어.
  * 상태는 즉시 브라우저 `localStorage`(`diary_theme`, `diary_font_preference`)에 동기화.

### 1.2 View 0: 표지 (Cover View)
* **`CoverView`**:
  * 닫힌 다이어리 표지(480×640px, 다크 톤 하드커버, 우측 라운딩 모서리).
  * 3D 언폴드 애니메이션(`transform: rotateY(-180deg)`, 700ms).
  * 상단 은은한 음각 타이틀: `PLAN-DO-SEE DIARY`.
* **`OpenPadlockIllustration`**:
  * `lucide: LockKeyholeOpen` (48px) 기반 정밀 2px 메탈 라인 잠금쇠.
  * 3D 렌더링 클립아트 절대 금지.
* **`NoticeMemoSticky`**:
  * 잠금쇠 하단 페일 옐로우 포스트잇 (`bg-[#FFFDE7]`, `rotate-[-2deg]`, `shadows.memo`).
  * **필수 렌더링 문구 (T06-C82, 토씨 변경 금지)**:
    > `"지금은 로그인이 없어 링크를 아는 사람은 누구나 볼 수 있습니다. 남이 봐도 괜찮은 내용만 넣으세요"`
  * 하단 "다이어리 열기 →" 인터랙션 영역.

### 1.3 3대 공통 정적 상태 피드백
* **`EmptyState`**: 깨끗한 빈 모눈종이 배경 + 연필 드로잉 아이콘 + `"아직 작성된 계획이 없습니다"` 안내 및 CTA.
* **`LoadingState` (Nib Pulse)**: 만년필 닙 좌우 흔들림 애니메이션(`motion.keyframes.penNibWiggle`) + `"기록 중..."` 인디케이터.
* **`ErrorState` (Coffee Splash)**: 반투명 커피 링 워터마크 배경 + 고대비 에러 박스 및 재시도 버튼.

---

## 2. [M2~M6 예정] 후속 마일스톤 구현 대상 (선반영 레퍼런스)

> ⚠️ **M1 작업 중에는 아래 컴포넌트를 구현하거나 import하지 마십시오.**

### [M2 - 계획 세우기]
* **`PlanCard`**: 활성 계획의 제목, 우선순위 배지, 기간, 예상 시간, 줄노트 성공 기준 리스트.
* **`RevisionTimeline`**: 계획 수정 이력 스냅샷 목록 (5건 페이징, 변경 전 값 취소선 `line-through` 렌더링).

### [M3 - 할 일 다루기]
* **`TaskFilterBar`**: 검색창, 상태/우선순위/마감일 필터 셀렉터.
* **`SortAnnouncementBanner`**:
  * 필수 문구(T06-C20): `"정렬 기준: 마감일 오름차순 → 우선순위(높음 우선) → 제목 가나다순 → ID순"`.
* **`TaskCard`**: 할 일 카드 (상태 토글 스티커, 마감일 `YY.MM.DD 23:30`, 태그 칩, `+기록`, 삭제 버튼).

### [M4 - 실행 기록]
* **`LogRecordDialog`**: 실행 기록 모달 (시작/종료 시각, 실시간 계산 시간 표시, 막혔던 이유 인풋).

### [M5 - 돌아보기]
* **`DateRangePicker`**: `YYYY-MM-DD ~ YYYY-MM-DD (KST)` 범위 선택 팝오버.
* **`MetricGrid`**: 4대 지표(계획 수, 완료 수, 실행 기록 수, 평균 시간 차이) 2×2 카드 그리드.
* **`MetricDrilldown`**: 선택된 지표에 따른 우측 페이지 상세 목록 전환 렌더러.

### [M6 - 휴지통]
* **`TrashCard`**: 삭제된 항목 카드 (구겨진 음영 + 마스킹 테이프 그래픽 + '복구' 버튼).
* **`TrashBanner`**: 7일 보관 후 영구 삭제 안내 문구.
