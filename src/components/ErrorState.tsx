import React from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = '기록을 불러오는 중 일시적인 오류가 발생했습니다.',
  onRetry,
}) => {
  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-8 bg-grid-pattern rounded-lg overflow-hidden">
      {/* 반투명 커피 링 워터마크 배경 (CSS/SVG 기반 에디토리얼 표현) */}
      <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full border-[10px] border-[#78350F]/15 pointer-events-none filter blur-[1px] transform rotate-12">
        <div className="w-full h-full rounded-full border-2 border-dashed border-[#78350F]/20 p-2">
          <div className="w-full h-full rounded-full bg-[#78350F]/5" />
        </div>
      </div>

      <div className="absolute -bottom-8 -left-8 w-40 h-40 rounded-full border-[8px] border-[#78350F]/10 pointer-events-none filter blur-[0.5px]">
        <div className="w-full h-full rounded-full border border-[#78350F]/15" />
      </div>

      {/* 고대비 에러 박스 (High-contrast Error Container) */}
      <div className="relative z-10 w-full max-w-sm bg-white/95 border border-stone-300 rounded-lg p-6 shadow-modal flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-amber-800 mb-3">
          <AlertCircle className="w-6 h-6 stroke-[2]" />
        </div>

        <div className="font-sans text-sm font-semibold text-stone-900 mb-1">
          기록 동기화 실패
        </div>

        <div className="font-sans text-xs text-stone-600 mb-5 leading-relaxed">
          {message}
        </div>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 active:scale-95 text-stone-100 rounded text-xs font-sans font-medium transition-all shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>다시 시도하기</span>
          </button>
        )}
      </div>
    </div>
  );
};
