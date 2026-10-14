import React from 'react';
import { Feather, Compass } from 'lucide-react';

export const DeskMemoSheet: React.FC = () => {
  return (
    <div className="w-full h-full flex items-center justify-center p-6 select-none">
      {/* 데스크 위에 비스듬히 놓인 에디토리얼 메모지 */}
      <div
        className="relative w-[380px] h-[500px] rounded-lg p-8 flex flex-col justify-between border border-stone-200/90 shadow-lg rotate-[-1.2deg] transition-transform hover:rotate-0 duration-300"
        style={{
          backgroundColor: 'var(--color-paper)',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* 상단 반투명 마스킹 테이프 데코레이션 */}
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-6 bg-stone-300/40 backdrop-blur-xs border-y border-stone-400/20 rotate-[1deg] shadow-2xs pointer-events-none"
          style={{ clipPath: 'polygon(3% 0%, 97% 0%, 100% 100%, 0% 100%)' }}
        />

        {/* 메모지 상단 헤더 */}
        <div className="pt-2">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div className="flex items-center gap-1.5 text-stone-500">
              <Compass className="w-3.5 h-3.5" />
              <span className="font-mono text-[10px] tracking-wider text-stone-600">
                Philosophy & Essence
              </span>
            </div>
            <span className="font-mono text-[10px] text-stone-400">
              ALEPH-06
            </span>
          </div>
        </div>

        {/* 메모지 중앙 핵심 글귀 */}
        <div className="my-auto space-y-6 text-center px-2">
          <div className="flex justify-center text-stone-400">
            <Feather className="w-6 h-6 stroke-1 text-stone-400" />
          </div>

          <div className="space-y-3">
            <h2 className="font-handwriting text-2xl text-stone-800 leading-relaxed break-keep">
              "생각을 기록하고, 행동을 살피며, 삶을 반추하다"
            </h2>
            <p className="font-sans text-xs text-stone-500 leading-relaxed break-keep">
              기록되지 않은 계획은 망각되고,
              <br />
              측정되지 않은 실행은 개선되지 않는다.
            </p>
          </div>

          <div className="pt-2">
            <span className="inline-block px-3 py-1 rounded-full bg-stone-100 text-stone-600 font-sans text-[11px] font-medium border border-stone-200">
              Plan → Do → See
            </span>
          </div>
        </div>

        {/* 메모지 하단 푸터 */}
        <div className="pt-4 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono text-stone-400">
          <span>WORKBOOK NOTE</span>
          <span>EST. 2026</span>
        </div>
      </div>
    </div>
  );
};
