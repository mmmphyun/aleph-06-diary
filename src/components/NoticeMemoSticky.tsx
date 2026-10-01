import React from 'react';
import { BookOpen } from 'lucide-react';

interface NoticeMemoStickyProps {
  onOpen: () => void;
  disabled?: boolean;
}

export const NoticeMemoSticky: React.FC<NoticeMemoStickyProps> = ({ onOpen, disabled = false }) => {
  // T06-C82 필수 안내 포스트잇 문구 (토씨 변경 절대 금지)
  const noticeText = '지금은 로그인이 없어 링크를 아는 사람은 누구나 볼 수 있습니다. 남이 봐도 괜찮은 내용만 넣으세요';

  return (
    <div
      className="relative w-80 bg-[#FFFDE7] border border-amber-200/60 p-5 rounded-sm shadow-memo transform -rotate-2 transition-all hover:rotate-0 hover:scale-[1.02] duration-200"
      style={{
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* 마스킹 테이프 장식 */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-stone-300/50 backdrop-blur-xs rotate-1 border-t border-b border-black/5" />

      {/* 안내 메모 본문 (사용자 선택 손글씨 폰트 적용) */}
      <div className="font-handwriting text-stone-800 text-[15px] leading-relaxed pt-2 pb-4 text-center select-text">
        {noticeText}
      </div>

      {/* 하단 다이어리 열기 인터랙션 CTA 버튼 */}
      <div className="pt-2 border-t border-amber-200/50 flex justify-center">
        <button
          type="button"
          onClick={onOpen}
          disabled={disabled}
          className="group flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-900 active:scale-95 text-stone-100 rounded-md text-xs font-mono transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <BookOpen className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
          <span>다이어리 열기 →</span>
        </button>
      </div>
    </div>
  );
};
