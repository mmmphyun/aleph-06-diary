import React from 'react';
import { PenTool } from 'lucide-react';

export const LoadingState: React.FC = () => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-grid-pattern rounded-lg">
      <div className="relative mb-5 flex items-center justify-center">
        {/* 만년필 닙 좌우 흔들림 애니메이션 (motion.keyframes.penNibWiggle) */}
        <div className="animate-pen-nib text-stone-700 p-3 bg-stone-100 rounded-full border border-stone-200 shadow-sm">
          <PenTool className="w-8 h-8 stroke-[1.75]" />
        </div>
        {/* 하단 잉크 방울 이펙트 */}
        <span className="absolute -bottom-1 w-1.5 h-1.5 bg-stone-600 rounded-full animate-ping opacity-60" />
      </div>

      <div className="font-mono text-sm font-medium text-stone-700 tracking-wider">
        기록 중...
      </div>
      <div className="font-sans text-[11px] text-stone-400 mt-1">
        다이어리 데이터를 안전하게 동기화하고 있습니다
      </div>
    </div>
  );
};
