# Fonts Directory

본 디렉터리에는 다이어리 사용자 필기 영역 전용 3종 손글씨 폰트 파일이 배치되어 있습니다.

## 폰트 자산 목록
1. `normal.ttf`: 일반 필기체 (기본값) — 일상적이고 자연스러운 손글씨 (`font-family: NormalHandwriting`).
2. `adult.ttf`: 어른 글씨체 — 단정하고 각이 살아있는 손글씨 (`font-family: AdultHandwriting`).
3. `child.ttf`: 어린아이 글씨체 — 둥글둥글하고 자유로운 손글씨 (`font-family: ChildHandwriting`).

## 로딩 규칙
* 모든 `@font-face` 선언 시 `font-display: swap;`을 필수로 적용하여 초기 렌더링 블로킹(FOIT)을 방지합니다.
* 시스템 UI 및 정량 수치 영역에는 손글씨 폰트 적용을 엄격히 금지합니다.
