# LAYOUT.md — 뷰별 레이아웃 및 4대 키프레임 규격

## 1. 캔버스 및 바인더 섀시
* **컨테이너**: `w-full min-h-screen bg-[#EFECE6] flex items-center justify-center p-4 md:p-8 perspective-[1400px]`
* **바인더 본체 (Book Chassis)**:
  * 가로 960px × 세로 640px (1.5:1 가로형 양장 바인더).
  * 외부 테두리: `rounded-2xl bg-[#242220] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)]`.
  * 중앙 제본선: 폭 16px, `bg-gradient-to-r from-stone-300 via-stone-400 to-stone-200 opacity-60`, 안쪽 음영 `shadow-[inset_0_0_15px_rgba(0,0,0,0.15)]`.
  * 좌/우 속지: 크림색 무광 페이퍼 (`bg-[#FDFBF7]`), 내부 미세 여백 24px (`p-6` ~ `p-8`).

---

## 2. 4대 물리 키프레임 레이아웃

### Frame 0: 닫힘 상태 (Closed)
* **좌측 480×640px**:
  * 순수 웜스톤 데스크 바탕(`bg-[#EFECE6]`) 위의 독립형 데스크 메모지(`DeskMemoSheet`).
  * 검은 하드커버 좌측 연장 배제.
* **우측 480×640px**:
  * 닫힌 다이어리 1권의 검은색 하드커버 앞표지(`CoverView` Front).
  * 상단: `PLAN-DO-SEE DIARY` 음각 영문 타이틀.
  * 중앙: 2px 메탈 라인 잠금쇠 일러스트(`OpenPadlockIllustration`).
  * 하단 메모지: 페일 옐로우 포스트잇(`NoticeMemoSticky`, T06-C82 필수 안내문 + `"다이어리 열기 →"` 수동 버튼).

### Frame 1: 표지 열림 정지 노출 (Cover Opened & Leaf 01 Standby)
* **좌측 480×640px (Inside Cover)**:
  * 180도 회전하여 안착한 하드커버 안쪽 면 (`CoverView` Back).
  * 소유자 서명 입력 폼: `"THIS DIARY BELONGS TO:"` 라벨 + 단선 언더라인 손글씨 인풋 (`font-handwriting`, `localStorage('diary_owner_name')`).
  * 상단 우측: 실수로 표지만 열었을 때 복귀 가능한 `[ 표지 닫기 ]` 버튼.
* **우측 480×640px (LEAF 01: 표제지)**:
  * 첫 번째 흰색 내지(`FlipLeaf` Front, 크림색 속지). 하부의 타임라인을 완전히 차단.
  * 상단: `PLAN-DO-SEE | LEAF 01`.
  * 중앙: `BookOpen` 아이콘 + 손글씨 타이틀 `"기록과 성찰의 시간"` + 서술문.
  * 하단 우측: 명시적 다음 장 넘김 버튼 `[ 다음 장 넘기기 → ]` (수동 인터랙션 트리거).

### Frame 2: 내지 플립 전이 (Leaf Flipping Transition)
* **우측 내지 1장 단독 회전**:
  * 검은 하드커버는 바닥에 고정된 채, 오직 우측의 흰색 내지 1장(`FlipLeaf`)만 중앙 제본선 축으로 180도 좌측 회전(`rotateY(-180deg)`, 450ms).
  * 우측 아래에 덮여 있던 타임라인(`RevisionTimeline`)이 점진적으로 노출됨.

### Frame 3: 본문 안착 및 완전 개방 (Opened / Content Active)
* **좌측 480×640px (`PlanCard`)**:
  * 줄노트 배경(`bg-ruled-lines`) 위 활성 계획 카드.
  * 계획 제목, 성공 기준 목록, 인라인 수정 입력란에 `font-handwriting` 손글씨 폰트 적용.
  * 팝업 모달 없이 줄노트 위에서 직접 작성/수정하는 인라인 편집 폼(Inline Form) 내장.
  * **성공 기준 무스크롤 페이지네이션**: 스크롤바를 배제하고 책 메타포를 준수하여 5개 단위 쪽 넘김(`readPage`, `editPage`)으로 전개.
  * 하단: `PAGE 01` 인덱스 + `[ 표지 닫기 ]` 버튼.
* **중앙 16px (`SpineDivider`)**:
  * 제본선 음영 및 링 텍스처.
* **우측 480×640px (`RevisionTimeline`)**:
  * 5건 단위 페이징 무스크롤 타임라인.
  * 변경 전 값 취소선(`line-through`) 및 변경 후 값 대조 인라인 렌더링.
  * 하단: 페이지 전환 버튼 (`[< 이전]`, `[다음 >]`) 및 `PAGE 02` 인덱스.

---

## 3. 뷰별 화면 분할 (View Specs)

### View 0: 표지 (Cover)
* 규격: `w-[480px] h-[640px] bg-[#242220] rounded-r-2xl p-8 flex flex-col justify-between`.
* 앞표지 및 안쪽 표지(소유자 서명란) 2면 구성.

### View 2: 계획 (Plan)
* **좌측 페이지**:
  * 현재 활성 계획 카드 (`PlanCard`).
  * 줄노트 인라인 편집 모드: 팝업 모달 다이얼로그 완전 배제.
  * 상단 우선순위/시간/종료일 3분할 컨트롤 + 줄노트 위 성공 기준 항목별 인라인 수정/추가/삭제.
* **우측 페이지**:
  * 수정 이력 타임라인 (`RevisionTimeline`).
  * 5건 단위 페이지네이션, 취소선 `line-through` 렌더링.

### View 1: 돌아보기 (Review)
* 날짜 범위 선택기 + 4대 지표 카드(2×2) + 상세 드릴다운 목록.

### View 3: 할 일 (Tasks)
* 검색, 필터, 정렬 공시 배너 + 1열 할 일 카드 목록 + 인라인 실행 기록 폼.

### View 4: 휴지통 (Trash)
* 삭제된 카드 목록 (사선 마스킹 테이프 그래픽 + '복구' 버튼).
