# INTERACTION.md — 2.5D 인터랙션 및 애니메이션 물리 명세

> 모든 3D 회전과 움직임은 GPU 합성 스레드(Compositor Thread)에서 실행되도록 `transform`과 `opacity`만 제어합니다.

---

### 1. 표지 열기 / 닫기 (Cover Unfold / Fold)
* **표지 열기**:
  * 트리거: 표지 영역 클릭 또는 '다이어리 열기' 버튼 클릭.
  * 회전 축: `transform-origin: left center`
  * 속성: `transform: rotateY(-180deg)`
  * 지속 시간 및 타이밍: `700ms cubic-bezier(0.16, 1, 0.3, 1)`
  * 조명 페이크: 0°~90° 구간에서 표지 뒷면 오버레이 음영 `opacity` 0.4까지 증가 후 90°~180°에서 0으로 페이드아웃.
* **표지 닫기**:
  * 트리거: 헤더의 '표지 닫기' 버튼.
  * 속성: `transform: rotateY(0deg)`
  * 지속 시간: `600ms cubic-bezier(0.2, 0, 0, 1)`

---

### 2. 탭 전환 책장 넘김 (Page Curl Flip)
* 트리거: 우측 인덱스 탭(돌아보기, 계획, 할 일, 휴지통) 클릭.
* 회전 축: `transform-origin: left center`
* 속성: `transform: rotateY(-180deg)`
* 지속 시간: `450ms ease-out`
* 방어 로직: 회전 중 폼 입력 방지를 위해 `pointer-events-none` 적용, 애니메이션 종료 후 해제.

---

### 3. 상태 인터랙션
* **할 일 완료 (Stamp Spring)**:
  * 완료 버튼 클릭 시 `scale(0.9) -> scale(1.05) -> scale(1)` 스프링 햅틱 (250ms `cubic-bezier(0.34, 1.56, 0.64, 1)`).
  * 트랜잭션 진행 중 중복 클릭 방지 (버튼 즉시 `disabled`).
* **할 일 삭제 (Tear & Fade)**:
  * 우측 상단이 지그재그로 찢어지며 아래로 페이드아웃 (`clip-path` + `translateY(8px)` + `opacity: 0`, 300ms).
* **휴지통 복구 (Tape Peel)**:
  * 마스킹 테이프 회전 각도 복원 및 카드 원위치 (350ms).
* **저장 중 (Nib Pulse)**:
  * 헤더 우측 만년필 닙 아이콘 좌우 ±3px, 각도 ±5° 미세 흔들림 루프 (1s).
* **오류 발생 (Coffee Splash)**:
  * 배경에 옅은 커피 링 워터마크 표시 + 전경에 명확한 에러 박스 팝업 (400ms).
