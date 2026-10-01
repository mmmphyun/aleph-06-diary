import React from 'react';
import { PencilLine, Plus } from 'lucide-react';

interface EmptyStateProps {
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onAction }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-grid-pattern rounded-lg">
      <div className="w-16 h-16 rounded-full bg-stone-100 border border-dashed border-stone-300 flex items-center justify-center text-stone-400 mb-4 shadow-sm">
        <PencilLine className="w-7 h-7 stroke-[1.5]" />
      </div>

      <div className="font-sans text-sm font-semibold text-stone-700 mb-1">
        아직 작성된 계획이 없습니다
      </div>

      <div className="font-sans text-xs text-stone-400 text-center max-w-xs mb-6 leading-relaxed">
        오늘 하루 실천할 작고 구체적인 계획을 세우고 실행 기록을 남겨보세요.
      </div>

      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="flex items-center gap-1.5 px-4 py-2 bg-stone-800 hover:bg-stone-900 active:scale-95 text-stone-100 rounded text-xs font-sans font-medium transition-all shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>새 계획 작성하기</span>
        </button>
      )}
    </div>
  );
};
