import React from 'react';
import { LockKeyholeOpen } from 'lucide-react';

interface OpenPadlockIllustrationProps {
  className?: string;
}

export const OpenPadlockIllustration: React.FC<OpenPadlockIllustrationProps> = ({
  className = '',
}) => {
  return (
    <div
      className={`flex items-center justify-center p-3 rounded-full border border-stone-600/30 bg-stone-900/40 backdrop-blur-sm shadow-inner ${className}`}
      aria-label="열린 자물쇠 아이콘"
    >
      {/* 정밀 2px 메탈 라인 잠금쇠 (T06-C82 / 3D 클립아트 절대 금지) */}
      <LockKeyholeOpen
        size={48}
        strokeWidth={2}
        className="text-stone-300 transition-transform duration-300 hover:scale-105"
      />
    </div>
  );
};
