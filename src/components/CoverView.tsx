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
  // 다이어리가 완전히 열린 상태(애니메이션 종료 후)에서는 양면 내지 조작을 위해 커버를 비활성화
  if (isOpen && !isAnimating) {
    return null;
  }

  return (
    <div
      className={`absolute top-0 right-0 w-[480px] h-[640px] z-30 select-none ${
        isAnimating ? 'pointer-events-none' : ''
      }`}
      style={{
        transformOrigin: 'left center',
        transformStyle: 'preserve-3d',
        transition: 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1)',
        transform: isOpen ? 'rotateY(-180deg)' : 'rotateY(0deg)',
      }}
    >
      {/* 표지 앞면 (Front Cover) */}
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

      {/* 표지 뒷면 (Backface Inside Cover - 표지가 -180도 회전했을 때 왼쪽 페이지 뒤에 붙는 면) */}
      <div
        className="absolute inset-0 w-full h-full rounded-l-xl border-y-4 border-l-4 border-[#2E2A27]/80 flex flex-col items-center justify-center p-6 text-stone-300 backface-hidden shadow-inner"
        style={{
          backgroundColor: 'var(--color-cover)',
          transform: 'rotateY(180deg)',
        }}
      >
        <div className="w-full h-full border border-stone-600/30 rounded-lg p-6 flex flex-col justify-between bg-stone-900/30">
          <div className="text-xs font-mono text-stone-400">
            <div>INSIDE COVER</div>
            <div className="text-[10px] text-stone-500 mt-1">PLAN-DO-SEE NOTEBOOK</div>
          </div>
          <div className="text-center font-handwriting text-stone-400 text-lg">
            "생각을 기록하고, 행동을 살피며, 삶을 반추하다"
          </div>
          <div className="text-[10px] font-mono text-stone-500 text-right">
            ALEPH-06 • SYSTEM
          </div>
        </div>
      </div>
    </div>
  );
};
