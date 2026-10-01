import React from 'react';
import { OpenPadlockIllustration } from './OpenPadlockIllustration';
import { NoticeMemoSticky } from './NoticeMemoSticky';

interface CoverViewProps {
  isOpen: boolean;
  isAnimating: boolean;
  onOpen: () => void;
}

export const CoverView: React.FC<CoverViewProps> = ({
  isOpen,
  isAnimating,
  onOpen,
}) => {
  // 완전히 열린 후(애니메이션 완료)에는 속지 조작을 위해 커버를 비활성화
  const isFullyOpen = isOpen && !isAnimating;

  return (
    <div
      className={`absolute top-0 right-0 w-[480px] h-[640px] z-30 select-none ${
        isFullyOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
      } ${isAnimating ? 'pointer-events-none' : ''}`}
      style={{
        transformOrigin: 'left center',
        transformStyle: 'preserve-3d',
        transition: 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease',
        transform: isOpen ? 'rotateY(-180deg)' : 'rotateY(0deg)',
      }}
    >
      {/* 표지 앞면 (Front Cover): 0°~90° 구간에서만 보이고, 90° 이상 회전 시 backface-hidden에 의해 자연 소멸 */}
      <div
        className="absolute inset-0 w-full h-full rounded-r-xl border-y-4 border-r-4 border-[#2E2A27]/80 flex flex-col items-center justify-between p-8 text-stone-200 backface-hidden shadow-2xl"
        style={{
          backgroundColor: 'var(--color-cover)',
          boxShadow: 'inset 4px 0 10px rgba(0,0,0,0.4), 10px 0 25px rgba(0,0,0,0.3)',
        }}
      >
        {/* 상단 은은한 음각 타이틀 (roles.coverTitle) */}
        <div className="pt-6 text-center">
          <div className="text-[0.875rem] font-mono font-medium tracking-[0.25em] uppercase text-stone-400/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
            PLAN-DO-SEE DIARY
          </div>
          <div className="text-[10px] font-mono tracking-widest text-stone-500 mt-1">
            EST. 2026 • WORKBOOK
          </div>
        </div>

        {/* 중앙 정밀 2px 메탈 라인 잠금쇠 일러스트 */}
        <div className="my-auto flex flex-col items-center gap-6">
          <OpenPadlockIllustration />

          {/* T06-C82 필수 안내 포스트잇 */}
          <NoticeMemoSticky onOpen={onOpen} disabled={isOpen || isAnimating} />
        </div>

        {/* 하단 미니멀 브랜드 레이블 */}
        <div className="pb-4 text-center">
          <span className="text-[11px] font-mono tracking-wider text-stone-500/80">
            PRIVATE LOCAL MEMORY
          </span>
        </div>
      </div>
    </div>
  );
};
