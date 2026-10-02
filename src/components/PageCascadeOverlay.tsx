import React, { useEffect, useState } from 'react';

interface PageCascadeOverlayProps {
  isCascading: boolean;
  direction?: 'forward' | 'backward'; // forward: 우->좌(다음 섹션), backward: 좌->우(이전 섹션)
}

export const PageCascadeOverlay: React.FC<PageCascadeOverlayProps> = ({
  isCascading,
  direction = 'forward',
}) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isCascading) {
      setStep(1); // 렌더링 즉시 트랜지션 트리거
    } else {
      setStep(0);
    }
  }, [isCascading]);

  if (!isCascading && step === 0) return null;

  // 촤라락 넘어갈 3장의 가상 속지 시차 설정
  const leaves = [
    { id: 'leaf-1', delay: 0 },
    { id: 'leaf-2', delay: 45 },
    { id: 'leaf-3', delay: 90 },
  ];

  const isForward = direction === 'forward';

  return (
    <div
      className="absolute inset-0 w-full h-full z-40 pointer-events-none overflow-visible perspective-1400 select-none"
      aria-hidden="true"
    >
      {leaves.map((leaf, index) => {
        // forward: 0deg -> -180deg (우측에서 좌측으로 플립)
        // backward: -180deg -> 0deg (좌측에서 우측으로 플립)
        let transformStr: string;
        if (isForward) {
          transformStr = step === 1 ? 'rotateY(-180deg)' : 'rotateY(0deg)';
        } else {
          transformStr = step === 1 ? 'rotateY(0deg)' : 'rotateY(-180deg)';
        }

        return (
          <div
            key={leaf.id}
            className="absolute top-0 left-[480px] w-[480px] h-[640px] transform-style-preserve-3d"
            style={{
              transformOrigin: 'left center',
              transform: transformStr,
              transition: `transform 260ms cubic-bezier(0.25, 0.8, 0.25, 1) ${leaf.delay}ms`,
              zIndex: isForward ? 40 + (leaves.length - index) : 40 + index,
            }}
          >
            {/* 가상 속지 앞면 */}
            <div
              className="absolute inset-0 w-full h-full rounded-r-lg border-y border-r border-stone-200/80 shadow-md flex flex-col justify-between p-8 backface-hidden"
              style={{
                backgroundColor: 'var(--color-paper)',
                boxShadow: 'inset 4px 0 8px rgba(0,0,0,0.06), 6px 0 15px rgba(0,0,0,0.1)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
            >
              <div className="w-full flex items-center justify-between opacity-30 border-b border-stone-300 pb-2">
                <div className="h-2 w-16 bg-stone-300 rounded" />
                <div className="h-2 w-8 bg-stone-200 rounded" />
              </div>
              <div className="space-y-3 opacity-20 my-auto">
                <div className="h-2.5 w-3/4 bg-stone-300 rounded" />
                <div className="h-2.5 w-5/6 bg-stone-300 rounded" />
                <div className="h-2.5 w-1/2 bg-stone-300 rounded" />
              </div>
              <div className="w-full opacity-25 border-t border-stone-200 pt-2 flex justify-between">
                <div className="h-2 w-12 bg-stone-200 rounded" />
              </div>
            </div>

            {/* 가상 속지 뒷면 */}
            <div
              className="absolute inset-0 w-full h-full rounded-l-lg border-y border-l border-stone-200/80 shadow-md flex flex-col justify-between p-8 backface-hidden"
              style={{
                backgroundColor: 'var(--color-paper)',
                transform: 'rotateY(180deg)',
                boxShadow: 'inset -4px 0 8px rgba(0,0,0,0.06), -6px 0 15px rgba(0,0,0,0.1)',
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
            >
              <div className="w-full flex items-center justify-between opacity-30 border-b border-stone-300 pb-2">
                <div className="h-2 w-16 bg-stone-300 rounded" />
                <div className="h-2 w-8 bg-stone-200 rounded" />
              </div>
              <div className="space-y-3 opacity-20 my-auto">
                <div className="h-2.5 w-3/4 bg-stone-300 rounded" />
                <div className="h-2.5 w-5/6 bg-stone-300 rounded" />
                <div className="h-2.5 w-1/2 bg-stone-300 rounded" />
              </div>
              <div className="w-full opacity-25 border-t border-stone-200 pt-2 flex justify-between">
                <div className="h-2 w-12 bg-stone-200 rounded" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
