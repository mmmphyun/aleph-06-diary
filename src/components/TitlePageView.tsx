import React, { useState } from 'react';
import { PlanPackage } from '../types/binder';
import { BookOpen, Plus, ArrowRight, CheckCircle2, Circle } from 'lucide-react';

interface TitlePageViewProps {
  packages: PlanPackage[];
  currentPackageId: string;
  onSelectPackage: (pkgId: string) => void;
  onCreatePackage: (title: string) => void;
  onTurnPage: () => void;
  disabled?: boolean;
}

export const TitlePageView: React.FC<TitlePageViewProps> = ({
  packages,
  currentPackageId,
  onSelectPackage,
  onCreatePackage,
  onTurnPage,
  disabled = false,
}) => {
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [isAddingPlan, setIsAddingPlan] = useState(false);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPlanTitle.trim();
    if (!trimmed) return;
    onCreatePackage(trimmed);
    setNewPlanTitle('');
    setIsAddingPlan(false);
  };

  const selectedPkg = packages.find((p) => p.id === currentPackageId) || packages[0];

  return (
    <div
      className="w-[480px] h-full p-8 flex flex-col justify-between select-none relative"
      style={{ backgroundColor: 'var(--color-paper)', zIndex: 25 }}
    >
      {/* 상단 에디토리얼 타이틀 & 발간 정보 */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-stone-500 uppercase tracking-widest">
            <BookOpen className="w-3.5 h-3.5 text-stone-600" />
            <span>TABLE OF CONTENTS • LEAF 01</span>
          </div>
          <span className="font-mono text-[10px] text-stone-400">
            {packages.length} PLANS REGISTERED
          </span>
        </div>

        <div className="mt-4 text-center space-y-0.5">
          <h1 className="font-serif text-2xl font-bold tracking-tight text-stone-900">
            ALEPH-06 PLAN-DO-SEE
          </h1>
          <p className="font-mono text-[10px] text-stone-500 tracking-wider uppercase">
            Workbook Index & Chapter Navigator
          </p>
        </div>
      </div>

      {/* 중앙: 동적 계획 목차 테이블 (TOC) */}
      <div className="my-auto py-2 space-y-2.5">
        <div className="text-[10px] font-mono tracking-widest text-stone-400 text-center uppercase">
          — Index of Plans —
        </div>

        <div className="space-y-1.5 max-h-[300px] overflow-hidden">
          {packages.map((pkg, idx) => {
            const isSelected = pkg.id === currentPackageId;
            const completedCount = pkg.tasks.filter((t) => t.done).length;
            const totalCount = pkg.tasks.length;
            const chNum = String(idx + 1).padStart(2, '0');
            const pageNum = String(pkg.startPage).padStart(2, '0');

            return (
              <div
                key={pkg.id}
                onClick={() => onSelectPackage(pkg.id)}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer group flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-50/80 border-amber-300/80 shadow-2xs'
                    : 'bg-stone-50/60 hover:bg-stone-100/80 border-stone-200/80'
                }`}
                title={`클릭하여 ${pkg.title} 계획으로 이동`}
              >
                {/* 챕터 행: 번호 + 제목 + 점선 가이드 + 페이지 번호 */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-[10px] text-stone-500 font-semibold shrink-0">
                      CH.{chNum}
                    </span>
                    <span className="font-serif font-bold text-stone-900 truncate group-hover:text-amber-900 transition-colors">
                      {pkg.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="font-mono text-[11px] text-stone-400">
                      P.{pageNum}
                    </span>
                  </div>
                </div>

                {/* 하위 정보: 할 일 및 실행 현황 */}
                <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-stone-500">
                  <div className="flex items-center gap-1.5">
                    {completedCount > 0 ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Circle className="w-3 h-3 text-stone-400" />
                    )}
                    <span>
                      할 일 {totalCount}건 • 완료 {completedCount}건
                    </span>
                  </div>
                  {totalCount > 0 && (
                    <span className="text-[9px] text-stone-400">
                      {Math.round((completedCount / totalCount) * 100)}% 달성
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 새 계획 추가 인라인 폼 */}
        {isAddingPlan ? (
          <form onSubmit={handleCreateSubmit} className="pt-1 flex gap-1.5">
            <input
              type="text"
              value={newPlanTitle}
              onChange={(e) => setNewPlanTitle(e.target.value)}
              placeholder="새 계획 제목 입력..."
              autoFocus
              className="flex-1 bg-white border border-stone-300 rounded px-2 py-1 text-xs font-serif text-stone-900 outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded bg-stone-800 text-white text-[11px] font-sans font-medium cursor-pointer"
            >
              추가
            </button>
            <button
              type="button"
              onClick={() => setIsAddingPlan(false)}
              className="px-2 py-1 rounded text-stone-500 hover:text-stone-800 text-[11px] font-sans cursor-pointer"
            >
              취소
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAddingPlan(true)}
            className="w-full py-1.5 rounded border border-dashed border-stone-300 hover:border-stone-400 text-stone-500 hover:text-stone-800 text-[11px] font-sans flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>새 계획 추가하기</span>
          </button>
        )}
      </div>

      {/* 하단: 선택된 계획으로 첫 장 넘김 버튼 & 메타 정보 */}
      <div className="pt-3 border-t border-stone-200 space-y-2.5">
        <div className="flex items-center justify-between text-[11px] font-mono text-stone-500">
          <span>SELECTED: {selectedPkg ? `P.${selectedPkg.startPage}` : 'P.01'}</span>
          <span>ALEPH-06 • SYSTEM</span>
        </div>

        <button
          type="button"
          onClick={onTurnPage}
          disabled={disabled}
          className="w-full py-2.5 px-4 rounded-lg bg-stone-800 hover:bg-stone-900 text-white font-sans text-xs font-medium transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer group hover:shadow"
        >
          <span>
            {selectedPkg ? `"${selectedPkg.title}" 계획 펼치기` : '첫 장 넘겨 계획 작성하기'}
          </span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
};
