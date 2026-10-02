import React, { useEffect, useState } from 'react';

interface SingleLeafFlipOverlayProps {
  isFlipping: boolean;
  direction?: 'forward' | 'backward'; // forward: 우->좌, backward: 좌->우
}

export const SingleLeafFlipOverlay: React.FC<SingleLeafFlipOverlayProps> = ({
  isFlipping,
  direction = 'forward',
}) => {
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (isFlipping) {
      setAnimating(true);
    } else {
      setAnimating(false);
    }
  }, [isFlipping]);

  if (!isFlipping && !animating) return null;

  const isForward = direction === 'forward';

  return (
    <div
      className="absolute inset-0 w-full h-full z-40 pointer-events-none overflow-visible perspective-1400 select-none"
      aria-hidden="true"
    >
      <div
        className="absolute top-0 left-[480px] w-[480px] h-[640px] transform-style-preserve-3d"
        style={{
          transformOrigin: 'left center',
          transform: isForward
            ? (animating ? 'translateZ(10px) rotateY(-180deg)' : 'translateZ(10px) rotateY(0deg)')
            : (animating ? 'translateZ(10px) rotateY(0deg)' : 'translateZ(10px) rotateY(-180deg)'),
          transition: 'transform 280ms cubic-bezier(0.25, 0.85, 0.25, 1)',
        }}
      >
        {/* 속지 앞면 (Front Face) */}
        <div
          className="absolute inset-0 w-full h-full rounded-r-lg border-y border-r border-stone-200/90 shadow-xl flex flex-col justify-between p-8 bg-ruled-lines backface-hidden"
          style={{
            backgroundColor: 'var(--color-paper)',
            boxShadow: 'inset 4px 0 12px rgba(0,0,0,0.06), 8px 0 24px rgba(0,0,0,0.12)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <div className="w-full flex items-center justify-between border-b border-stone-200 pb-3 opacity-40">
            <span className="font-mono text-xs text-stone-500">PLAN-DO-SEE</span>
            <span className="font-mono text-[11px] text-stone-400">PAGE</span>
          </div>
          <div className="h-[380px]" />
          <div className="pt-2 border-t border-stone-200 flex items-center justify-between opacity-30 text-[10px] font-mono text-stone-400">
            <span>ALEPH-06</span>
          </div>
        </div>

        {/* 속지 뒷면 (Back Face - 180도 반전) */}
        <div
          className="absolute inset-0 w-full h-full rounded-l-lg border-y border-l border-stone-200/90 shadow-xl flex flex-col justify-between p-8 bg-ruled-lines backface-hidden"
          style={{
            backgroundColor: 'var(--color-paper)',
            transform: 'rotateY(180deg)',
            boxShadow: 'inset -4px 0 12px rgba(0,0,0,0.06), -8px 0 24px rgba(0,0,0,0.12)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <div className="w-full flex items-center justify-between border-b border-stone-200 pb-3 opacity-40">
            <span className="font-mono text-xs text-stone-500">PLAN-DO-SEE</span>
            <span className="font-mono text-[11px] text-stone-400">PAGE</span>
          </div>
          <div className="h-[380px]" />
          <div className="pt-2 border-t border-stone-200 flex items-center justify-between opacity-30 text-[10px] font-mono text-stone-400">
            <span>ALEPH-06</span>
          </div>
        </div>
      </div>
    </div>
  );
};
