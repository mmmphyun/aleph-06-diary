import React from 'react';
import { LockKeyhole } from 'lucide-react';

interface ClosedPadlockIllustrationProps {
  className?: string;
}

export const ClosedPadlockIllustration: React.FC<ClosedPadlockIllustrationProps> = ({
  className = '',
}) => {
  return (
    <div
      className={`flex items-center justify-center p-3 rounded-full border border-stone-600/30 bg-stone-900/40 backdrop-blur-sm shadow-inner ${className}`}
      aria-label="닫힌 자물쇠 아이콘"
    >
      {/* 정밀 2px 메탈 라인 닫힌 잠금쇠 (T07-C97 / 3D 클립아트 절대 금지) */}
      <LockKeyhole
        size={44}
        strokeWidth={2}
        className="text-stone-300 transition-transform duration-300 hover:scale-105"
      />
    </div>
  );
};
