# DESIGN.md — 플랜두씨 다이어리 디자인 시스템 가이드

## Taste Configuration (1-10 Scale)
<!-- Architecture derived from leonxlnx/taste-skill (MIT License, Copyright (c) 2025 Leon Linz) -->
<!-- Tune these knobs to govern visual output without ambiguous prose -->
- `DESIGN_VARIANCE`: 8   # 아날로그 손글씨, 지류 질감, 2.5D 양장 바인더 메타포의 차별화된 조판
- `VISUAL_DENSITY`: 7    # 960×640px 무스크롤 바인더 내 7행 격줄 에디터 및 정밀 인덱스 정보 밀도
- `MOTION_INTENSITY`: 6  # 280ms 낱장 3D 플립, 표지 450ms 언폴드, 캐스케이드 촤라락 넘김 모션

## 1. 디자인 철학 (Design Philosophy)
* **컨셉**: **Modern Tactile Editorial Stationery (현대적 지류·문구 편집 디자인)**
* **지향점**: 
  * 2012년 이전의 키치한 가죽 텍스처/클립아트 스큐어모피즘을 배제합니다.
  * *Craft, Bear, iA Writer, Linear* 수준의 정제된 타이포그래피, 1px 보더, 은은한 음영과 미니멀한 2.5D 물리적 조작감을 결합합니다.
  * 차분하고 집중력 높은 웜톤 지류 감성으로 계획(Plan)과 실제(Do), 돌아보기(See)의 인과관계를 단정하게 담아냅니다.

## 2. 단일 진실 공급원 (Single Source of Truth)
* 모든 시각 요소(색상, 간격, 타이포그래피, 모서리, 그림자)는 `.design/tokens/`를 엄격히 준수합니다.
* 임의의 하드코딩 헥사값(`border-[#E7E5E4]`) 및 원색 Tailwind 기본 클래스 사용을 금지합니다.
* 기본 테마: **테마 4 — 웜 토프 & 더스티 슬레이트 (`#3A3632` / `#4A6B82` / `#B8736B`)**.
* 4종 테마 및 3종 손글씨 폰트 동적 바인딩은 `PersonalizationContext`를 통해 런타임 CSS 변수로 주입됩니다.

## 3. 물리적 레이아웃 불변식
1. **바인더 섀시 규격**: 가로 960px × 세로 640px (1.5:1 가로형 양장 바인더), `perspective-[1400px]`.
2. **2-Tier 탐색 체계**:
   - Tier 1: 우측 바인더 모서리 24px 돌출 세로 인덱스 탭 (기록 / 돌아보기 / 보관함).
   - Tier 2: 중앙 제본선(X=480px) 축 280ms 낱장 3D 속지 플립.
3. **무스크롤(No-Scroll) 절대 원칙**:
   - 960×640px 바인더 판면 내부의 어떠한 컴포넌트에서도 브라우저 스크롤바 발생을 금지합니다.
4. **인라인 만년필 1회 교정 원칙**:
   - 팝업 모달 대신 원문에 만년필 취소선(`line-through`)을 긋고 바로 아래 18px 여백선에 버건디 손글씨 교정문을 기재합니다.

## 4. 컴포넌트 및 패턴 참조
* 레이아웃 및 뷰 구성: [layout-shells.md](./patterns/layout-shells.md)
* 데이터 표시 및 4-상태: [data-display.md](./patterns/data-display.md)
* 폼 및 인덱스 탐색: [forms-inputs.md](./patterns/forms-inputs.md)
* 마이크로 인터랙션: [micro-interactions.md](./patterns/micro-interactions.md)
