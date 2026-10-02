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
            ? (animating ? 'rotateY(-180deg)' : 'rotateY(0deg)')
            : (animating ? 'rotateY(0deg)' : 'rotateY(-180deg)'),
          transition: 'transform 320ms cubic-bezier(0.25, 0.85, 0.25, 1)',
        }}
      >
        {/* 속지 앞면 (Front Face) */}
        <div
          className="absolute inset-0 w-full h-full rounded-r-lg border-y border-r border-stone-200/90 shadow-xl flex flex-col justify-between p-8 backface-hidden"
          style={{
            backgroundColor: 'var(--color-paper)',
            boxShadow: 'inset 4px 0 10px rgba(0,0,0,0.08), 8px 0 20px rgba(0,0,0,0.12)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <div className="w-full flex items-center justify-between opacity-30 border-b border-stone-300 pb-2">
            <div className="h-2 w-20 bg-stone-300 rounded" />
            <div className="h-2 w-10 bg-stone-200 rounded" />
          </div>
          <div className="space-y-3 opacity-20 my-auto">
            <div className="h-3 w-3/4 bg-stone-300 rounded" />
            <div className="h-3 w-5/6 bg-stone-300 rounded" />
            <div className="h-3 w-1/2 bg-stone-300 rounded" />
            <div className="h-3 w-2/3 bg-stone-300 rounded" />
          </div>
          <div className="w-full opacity-25 border-t border-stone-200 pt-2 flex justify-between">
            <div className="h-2 w-16 bg-stone-200 rounded" />
          </div>
        </div>

        {/* 속지 뒷면 (Back Face - 180도 반전) */}
        <div
          className="absolute inset-0 w-full h-full rounded-l-lg border-y border-l border-stone-200/90 shadow-xl flex flex-col justify-between p-8 backface-hidden"
          style={{
            backgroundColor: 'var(--color-paper)',
            transform: 'rotateY(180deg)',
            boxShadow: 'inset -4px 0 10px rgba(0,0,0,0.08), -8px 0 20px rgba(0,0,0,0.12)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <div className="w-full flex items-center justify-between opacity-30 border-b border-stone-300 pb-2">
            <div className="h-2 w-20 bg-stone-300 rounded" />
            <div className="h-2 w-10 bg-stone-200 rounded" />
          </div>
          <div className="space-y-3 opacity-20 my-auto">
            <div className="h-3 w-3/4 bg-stone-300 rounded" />
            <div className="h-3 w-5/6 bg-stone-300 rounded" />
            <div className="h-3 w-1/2 bg-stone-300 rounded" />
            <div className="h-3 w-2/3 bg-stone-300 rounded" />
          </div>
          <div className="w-full opacity-25 border-t border-stone-200 pt-2 flex justify-between">
            <div className="h-2 w-16 bg-stone-200 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
};
