# LAYOUT.md — 뷰별 레이아웃 및 그리드 규격

## 1. 캔버스 및 바인더 섀시
* **컨테이너**: `w-full min-h-screen bg-[#EFECE6] flex items-center justify-center p-4 md:p-8 perspective-[1400px]`
* **바인더 본체 (Book Chassis)**:
  * 가로 960px × 세로 640px (1.5:1 가로형 양장 바인더).
  * 외부 테두리: `rounded-2xl bg-[#242220] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.35)]`.
  * 중앙 제본선: 폭 16px, `bg-gradient-to-r from-stone-300 via-stone-400 to-stone-200 opacity-60`, 안쪽 음영 `shadow-[inset_0_0_15px_rgba(0,0,0,0.15)]`.
  * 좌/우 속지: 크림색 무광 페이퍼 (`bg-[#FDFBF7]`), 내부 미세 여백 24px (`p-6`).

---

## 2. 뷰별 화면 분할

### View 0: 표지 (Cover)
* 규격: `w-[480px] h-[640px] bg-[#242220] rounded-r-2xl p-10 flex flex-col justify-between`.
* 상단: `Plan-Do-See Diary` 음각 타이틀.
* 중앙: 열린 라인 자물쇠 아이콘 (`lucide: LockKeyholeOpen`, 48px).
* 하단 메모지:
  * `bg-[#FFFDE7] text-stone-800 text-xs p-4 rounded-sm shadow-md rotate-[-2deg] border border-amber-200/60`.
  * 문구: *"지금은 로그인이 없어 링크를 아는 사람은 누구나 볼 수 있습니다. 남이 봐도 괜찮은 내용만 넣으세요"*
  * 액션: "다이어리 열기 →" 클릭 영역.

### View 1: 돌아보기 (Review - 첫 내지)
* **좌측 페이지**:
  * 날짜 선택기: `YYYY-MM-DD ~ YYYY-MM-DD (KST)`.
  * 4대 지표 카드 (2×2 그리드): 계획 수(개), 완료 수(개), 실행 기록 수(건), 평균 시간 차이(±분).
* **우측 페이지**:
  * 선택된 지표의 상세 드릴다운 목록 (계획 목록 / 완료 할 일 목록 / 실행 기록 타임라인 / 시간 오차 대조표).

### View 2: 계획 (Plan)
* **좌측 페이지**: 현재 활성 계획 카드 (제목, 우선순위, 기간, 예상 시간, 성공 기준 줄노트 텍스트).
* **우측 페이지**: 수정 이력 (5개 단위 페이지네이션, 취소선 `line-through` 렌더링).

### View 3: 할 일 (Tasks)
* **상단 바**: 검색 인풋, 상태/우선순위/마감일 필터, 정렬 공시 배너:
  > `"정렬 기준: 마감일 오름차순 → 우선순위(높음 우선) → 제목 가나다순 → ID순"`
* **본문**: 1열 카드 목록 (상태 토글 스티커, 마감일시 `YY.MM.DD 23:30`, 우선순위 뱃지, 태그, 소요 시간, `+기록`, 삭제 버튼).
* **실행 기록 모달**: 시작/종료 시각, 소요 시간 자동 계산 표시, 막혔던 이유.

### View 4: 휴지통 (Trash)
* 삭제된 카드 목록 (구겨진 음영 + 상단 사선 마스킹 테이프 연출), '복구' 버튼.
