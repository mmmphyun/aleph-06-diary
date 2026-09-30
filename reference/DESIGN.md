# DESIGN.md — 플랜두씨 다이어리 디자인 시스템 가이드

## 1. 디자인 철학 (Design Philosophy)
* **컨셉**: **Modern Tactile Editorial Stationery (현대적 지류·문구 편집 디자인)**
* **지향점**: 
  * 2012년 이전의 키치한 가죽 텍스처/클립아트 스큐어모피즘을 배제합니다.
  * *Craft, Bear, iA Writer, Linear* 수준의 정제된 타이포그래피, 1px 보더, 은은한 음영과 미니멀한 2.5D 물리적 조작감을 결합합니다.
  * 차분하고 집중력 높은 웜톤 지류 감성으로 계획(Plan)과 실제(Do), 돌아보기(See)의 인과관계를 단정하게 담아냅니다.

## 2. 디자인 토큰 및 개인화 연동 규칙
* **기본 테마**: **테마 4 — 웜 토프 & 더스티 슬레이트 (`#3A3632` / `#4A6B82` / `#B8736B`)**.
* **테마 및 폰트 개인화**:
  * 사용자가 4종 색상 테마와 3종 손글씨 폰트를 자유롭게 변경할 수 있도록 다이어리 상단 바인더 모서리에 미니 툴바(`[🎨 테마 ▾] [✏️ 펜 ▾]`)를 제공합니다.
  * 설정 상태는 브라우저 `localStorage`에 즉시 보존하여 새로고침 시에도 유지됩니다.
* 모든 색상값은 `reference/tokens/colors.json`에 정의된 토큰을 엄격히 준수합니다. 임의의 원색 Tailwind 기본 클래스 사용을 금지합니다.
* 크기 및 그리드 레이아웃은 `reference/tokens/spacing.json`을 따릅니다.

## 3. 세부 명세 참조 링크
* 레이아웃 및 뷰 구성: [`reference/notes/layout.md`](./notes/layout.md)
* 2.5D 회전 및 애니메이션: [`reference/notes/interaction.md`](./notes/interaction.md)
* 타이포그래피 및 폰트 스코핑: [`reference/notes/typography.md`](./notes/typography.md)
* **금지 사항 및 안티패턴 (필독)**: [`reference/notes/do-not-copy.md`](./notes/do-not-copy.md)
