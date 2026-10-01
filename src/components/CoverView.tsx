import React from 'react';
import { OpenPadlockIllustration } from './OpenPadlockIllustration';
import { NoticeMemoSticky } from './NoticeMemoSticky';

interface CoverViewProps {
  isOpen: boolean;
  onOpen: () => void;
  disabled?: boolean;
}

export const CoverView: React.FC<CoverViewProps> = ({
  isOpen,
  onOpen,
  disabled = false,
}) => {
  return (
    <div
      className={`absolute top-0 right-0 w-[480px] h-[640px] z-30 select-none ${
        disabled ? 'pointer-events-none' : ''
      }`}
      style={{
        transformOrigin: 'left center',
        transformStyle: 'preserve-3d',
        transition: 'transform 360ms cubic-bezier(0.2, 0, 0.2, 1)',
        transform: isOpen ? 'rotateY(-180deg)' : 'rotateY(0deg)',
      }}
    >
      {/* ---------------- 표지 앞면 (Front Cover) ---------------- */}
      <div
        className="absolute inset-0 w-full h-full rounded-r-xl border-y-4 border-r-4 border-[#2E2A27]/80 flex flex-col items-center justify-between p-8 text-stone-200 backface-hidden shadow-2xl"
        style={{
          backgroundColor: 'var(--color-cover)',
          boxShadow: 'inset 4px 0 10px rgba(0,0,0,0.4), 10px 0 25px rgba(0,0,0,0.3)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        {/* 상단 은은한 음각 타이틀 */}
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
          <NoticeMemoSticky onOpen={onOpen} disabled={disabled || isOpen} />
        </div>

        {/* 하단 미니멀 브랜드 레이블 */}
        <div className="pb-4 text-center">
          <span className="text-[11px] font-mono tracking-wider text-stone-500/80">
            PRIVATE LOCAL MEMORY
          </span>
        </div>
      </div>

      {/* ---------------- 표지 뒷면 (Inside Cover): 180도 회전했을 때 좌측에 보이는 하드커버 안쪽 ---------------- */}
      <div
        className="absolute inset-0 w-full h-full rounded-l-xl border-y-4 border-l-4 border-[#2E2A27]/80 flex flex-col items-center justify-center p-8 text-stone-300 backface-hidden shadow-inner"
        style={{
          backgroundColor: 'var(--color-cover)',
          transform: 'rotateY(180deg)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        <div className="w-full h-full border border-stone-600/30 rounded-lg p-6 flex flex-col justify-between bg-stone-900/40">
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
