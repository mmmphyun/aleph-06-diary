import React from 'react';
import { BookOpen, Feather, ShieldCheck, Clock, ArrowRight } from 'lucide-react';

interface TitlePageViewProps {
  onTurnPage: () => void;
  disabled?: boolean;
}

export const TitlePageView: React.FC<TitlePageViewProps> = ({
  onTurnPage,
  disabled = false,
}) => {
  return (
    <div
      className="w-[480px] h-full p-8 flex flex-col justify-between select-none"
      style={{ backgroundColor: 'var(--color-paper)' }}
    >
      {/* 상단 에디토리얼 타이틀 & 발간 정보 */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-stone-500 uppercase tracking-widest">
            <BookOpen className="w-3.5 h-3.5 text-stone-600" />
            <span>HALF-TITLE • LEAF 01</span>
          </div>
          <span className="font-mono text-[10px] text-stone-400">EST. 2026</span>
        </div>

        <div className="mt-6 text-center space-y-1">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
            ALEPH-06 PLAN-DO-SEE
          </h1>
          <p className="font-mono text-[11px] text-stone-500 tracking-wider uppercase">
            Workbook for Deliberate Practice & Reflection
          </p>
        </div>
      </div>

      {/* 중앙: 3대 아날로그 기록 원칙 */}
      <div className="my-auto space-y-3.5 py-4">
        <div className="text-[10px] font-mono tracking-widest text-stone-400 text-center uppercase">
          — 3 Guiding Principles —
        </div>

        {/* 원칙 1 */}
        <div className="p-3 rounded-lg bg-stone-100/70 border border-stone-200/90 flex items-start gap-3">
          <div className="p-1.5 rounded bg-amber-100/80 text-amber-900 mt-0.5">
            <Feather className="w-3.5 h-3.5" />
          </div>
          <div className="space-y-0.5">
            <div className="font-sans text-xs font-semibold text-stone-800">
              1. 기록의 연속성 (Continuity)
            </div>
            <p className="font-sans text-[11px] text-stone-500 leading-relaxed">
              스크롤 없이 좌우 양면으로 펼쳐지는 물리적 공간에서 생각을 온전히 전개합니다.
            </p>
          </div>
        </div>

        {/* 원칙 2 */}
        <div className="p-3 rounded-lg bg-stone-100/70 border border-stone-200/90 flex items-start gap-3">
          <div className="p-1.5 rounded bg-red-100/80 text-red-900 mt-0.5">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div className="space-y-0.5">
            <div className="font-sans text-xs font-semibold text-stone-800">
              2. 만년필 1회 교정 원칙 (Authenticity)
            </div>
            <p className="font-sans text-[11px] text-stone-500 leading-relaxed">
              지우개로 지우지 않고 가로 취소선과 하단 여백선에 단 한 번의 정직한 교정을 남깁니다.
            </p>
          </div>
        </div>

        {/* 원칙 3 */}
        <div className="p-3 rounded-lg bg-stone-100/70 border border-stone-200/90 flex items-start gap-3">
          <div className="p-1.5 rounded bg-teal-100/80 text-teal-900 mt-0.5">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div className="space-y-0.5">
            <div className="font-sans text-xs font-semibold text-stone-800">
              3. 시간 오차와 반추 (Reflection)
            </div>
            <p className="font-sans text-[11px] text-stone-500 leading-relaxed">
              계획과 실제 완수 시각의 오차를 측정하여 삶의 주도권을 되찾습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 하단: 기록 시작 버튼 & 메타 정보 */}
      <div className="pt-3 border-t border-stone-200 space-y-3">
        <div className="flex items-center justify-between text-[11px] font-mono text-stone-500">
          <span>DATE: 2026. 10. 02</span>
          <span>STATUS: READY</span>
        </div>

        <button
          type="button"
          onClick={onTurnPage}
          disabled={disabled}
          className="w-full py-2.5 px-4 rounded-lg bg-stone-800 hover:bg-stone-900 text-white font-sans text-xs font-medium transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer group hover:shadow"
        >
          <span>첫 장 넘겨 계획 작성하기</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
