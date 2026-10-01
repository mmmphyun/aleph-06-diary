import React from 'react';

export const SpineDivider: React.FC = () => {
  return (
    <div
      className="absolute left-1/2 top-0 -translate-x-1/2 w-4 h-full z-20 pointer-events-none"
      style={{
        boxShadow: 'inset 0 0 15px rgba(0, 0, 0, 0.15)',
        background:
          'linear-gradient(90deg, rgba(0,0,0,0.12) 0%, rgba(214,211,209,0.3) 50%, rgba(0,0,0,0.12) 100%)',
      }}
    >
      {/* 링 바인더 또는 실 제본 스티칭 추상 라인 (과도한 텍스처 없이 미니멀한 에디토리얼 라인) */}
      <div className="w-[1px] h-full mx-auto bg-stone-400/40" />
    </div>
  );
};
