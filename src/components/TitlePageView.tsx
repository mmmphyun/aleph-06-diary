import React, { useState, useMemo } from 'react';
import { PlanPackage } from '../types/binder';
import { BookOpen, Plus, ArrowRight, CheckCircle2, Circle, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface TitlePageViewProps {
  packages: PlanPackage[];
  currentPackageId: string;
  onSelectPackage: (pkgId: string) => void;
  onCreatePackage: (title: string, startDate?: string, endDate?: string) => void;
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
  // 시스템 현재 날짜 기준 초기화
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [currentYearMonth, setCurrentYearMonth] = useState<{ year: number; month: number }>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [isAddingPlan, setIsAddingPlan] = useState(false);

  // 월 이동 핸들러
  const handlePrevMonth = () => {
    setCurrentYearMonth((prev) => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 };
      return { year: prev.year, month: prev.month - 1 };
    });
  };

  const handleNextMonth = () => {
    setCurrentYearMonth((prev) => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 };
      return { year: prev.year, month: prev.month + 1 };
    });
  };

  // 날짜별 계획 건수 계산 헬퍼 (방안 B: period 범위 매핑, 휴지통 데이터 제외)
  const getPlanCountForDate = (dateStr: string): number => {
    return packages.filter((pkg) => {
      if (pkg.trashStatus === 1) return false;
      if (pkg.period) {
        return pkg.period.start <= dateStr && dateStr <= pkg.period.end;
      }
      return pkg.createdAt.startsWith(dateStr);
    }).length;
  };

  // 달력 날짜 매트릭스 계산 (일요일 시작)
  const calendarDays = useMemo(() => {
    const { year, month } = currentYearMonth;
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0: 일요일
    const lastDate = new Date(year, month + 1, 0).getDate();

    const days: Array<{
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      planCount: number;
    }> = [];

    // 이전 달 잔여 일수
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDate - i;
      const prevM = month === 0 ? 12 : month;
      const prevY = month === 0 ? year - 1 : year;
      const dateStr = `${prevY}-${String(prevM).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        planCount: getPlanCountForDate(dateStr),
      });
    }

    // 이번 달 일수
    for (let d = 1; d <= lastDate; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        planCount: getPlanCountForDate(dateStr),
      });
    }

    // 35개 또는 42개 칸 채우기 (다음 달 일수)
    const totalSlots = days.length <= 35 ? 35 : 42;
    const remaining = totalSlots - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextM = month === 11 ? 1 : month + 2;
      const nextY = month === 11 ? year + 1 : year;
      const dateStr = `${nextY}-${String(nextM).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false,
        planCount: getPlanCountForDate(dateStr),
      });
    }

    return days;
  }, [currentYearMonth, packages]);

  // 선택된 날짜에 실행되는 활성 계획 목록 필터링 (무스크롤 보장, 휴지통 제외)
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (pkg.trashStatus === 1) return false;
      if (pkg.period) {
        return pkg.period.start <= selectedDate && selectedDate <= pkg.period.end;
      }
      return pkg.createdAt.startsWith(selectedDate);
    });
  }, [packages, selectedDate]);

  // 패키지별 동적 페이지 분량 계산
  const getPackagePageRange = (pkg: PlanPackage, originalIndex: number): string => {
    const contentLines = pkg.content.split('\n').filter(Boolean);
    const planSpreads = Math.max(1, Math.ceil(contentLines.length / 14));
    const tasksSpreads = pkg.tasksTemplateApplied ? Math.max(1, Math.ceil(Math.max(1, pkg.tasks.filter((t) => t.trashStatus !== 1).length) / 14)) : 1;
    const hasLogs = pkg.tasks.some((t) => t.done && t.trashStatus !== 1) || pkg.logs.some((l) => l.trashStatus !== 1);
    const logsSpreads = hasLogs ? 1 : 0;
    const totalSpreads = planSpreads + tasksSpreads + logsSpreads;
    const chNum = String(originalIndex + 1).padStart(2, '0');
    return `CH.${chNum} • P.01 ~ P.${String(totalSpreads * 2).padStart(2, '0')}`;
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newPlanTitle.trim();
    if (!trimmed) return;
    onCreatePackage(trimmed, selectedDate, selectedDate);
    setNewPlanTitle('');
    setIsAddingPlan(false);
  };

  const activePackages = useMemo(() => packages.filter((p) => p.trashStatus !== 1), [packages]);
  const selectedPkg = packages.find((p) => p.id === currentPackageId && p.trashStatus !== 1) || filteredPackages[0] || activePackages[0] || packages[0];
  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
  const weekDayLabels = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <div
      className="w-[480px] h-full p-7 flex flex-col justify-between select-none relative overflow-hidden"
      style={{ backgroundColor: 'var(--color-paper)', zIndex: 25 }}
    >
      {/* ---------------- 1. 상단 시스템 헤더 & 타이틀 ---------------- */}
      <div>
        <div className="flex items-center justify-between pb-2 border-b border-stone-200">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-stone-600 tracking-normal">
            <BookOpen className="w-3.5 h-3.5 text-stone-700" />
            <span>TABLE OF CONTENTS • LEAF 01</span>
          </div>
          <span className="font-mono text-[10px] text-stone-400">
            총 {activePackages.length}개 계획 등록됨
          </span>
        </div>

        <div className="mt-2 text-center">
          <h1 className="font-serif text-xl font-bold tracking-tight text-stone-900">
            ALEPH-06 PLAN-DO-SEE
          </h1>
          <p className="font-mono text-[9px] text-stone-500 tracking-normal">
            Workbook Calendar & Chapter Navigator
          </p>
        </div>
      </div>

      {/* ---------------- 2. 월간 미니 달력 (Mini Calendar) ---------------- */}
      <div className="my-1 p-3 bg-stone-50/80 rounded-xl border border-stone-200/90 shadow-2xs">
        {/* 달력 헤더: 월 이동 및 선택일 표시 */}
        <div className="flex items-center justify-between pb-2 mb-1 border-b border-stone-200">
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-amber-800" />
            <span className="font-serif font-bold text-xs text-stone-800">
              {currentYearMonth.year}년 {monthNames[currentYearMonth.month]}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-mono text-[10px] text-stone-500 mr-1.5">
              선택: {selectedDate}
            </span>
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded hover:bg-stone-200 text-stone-600 cursor-pointer transition-colors"
              title="이전 달"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded hover:bg-stone-200 text-stone-600 cursor-pointer transition-colors"
              title="다음 달"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] text-stone-400 pb-1">
          {weekDayLabels.map((lbl, idx) => (
            <div key={lbl} className={idx === 0 ? 'text-red-400' : idx === 6 ? 'text-blue-400' : ''}>
              {lbl}
            </div>
          ))}
        </div>

        {/* 7열 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((slot) => {
            const isSelected = slot.dateStr === selectedDate;
            const isToday = slot.dateStr === todayStr;

            return (
              <button
                key={slot.dateStr}
                type="button"
                onClick={() => setSelectedDate(slot.dateStr)}
                className={`h-6 rounded flex items-center justify-center relative font-mono text-[11px] transition-colors cursor-pointer ${
                  !slot.isCurrentMonth
                    ? 'text-stone-300'
                    : isSelected
                    ? 'bg-stone-800 text-white font-bold shadow-xs scale-105 z-10'
                    : isToday
                    ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                    : 'text-stone-700 hover:bg-stone-200/70'
                }`}
              >
                <span>{slot.dayNum}</span>
                {/* 계획 건수 뱃지 */}
                {slot.planCount > 0 && (
                  <span
                    className={`absolute -top-1 -right-1 w-3.5 h-3.5 text-[8px] font-bold rounded-full flex items-center justify-center ${
                      isSelected
                        ? 'bg-amber-400 text-stone-900 ring-1 ring-white'
                        : 'bg-amber-600 text-white'
                    }`}
                  >
                    {slot.planCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ---------------- 3. 선택일 계획 목록 (필터링 기반 무스크롤 보장) ---------------- */}
      <div className="my-1 flex-1 flex flex-col justify-between max-h-[195px] overflow-hidden">
        <div className="flex items-center justify-between pb-1 border-b border-stone-200">
          <span className="font-mono text-[10px] text-stone-500 tracking-normal">
            — {selectedDate} 실행 계획 ({filteredPackages.length}건) —
          </span>
          <span className="font-mono text-[9px] text-stone-400">NO-SCROLL TOC</span>
        </div>

        {/* 계획 리스트 (최대 2~3개 압축 노출) */}
        <div className="space-y-1.5 mt-1 overflow-hidden">
          {filteredPackages.length === 0 ? (
            <div className="p-3 rounded-lg border border-dashed border-stone-300 text-center text-stone-400 bg-white/40">
              <p className="font-serif text-xs text-stone-600">이 날짜에 예정된 계획이 없습니다.</p>
              <p className="font-sans text-[10px] text-stone-400 mt-0.5">
                아래 버튼을 눌러 이 날짜에 실행할 새로운 계획을 작성하세요.
              </p>
            </div>
          ) : (
            filteredPackages.slice(0, 2).map((pkg) => {
              const originalIdx = packages.findIndex((p) => p.id === pkg.id);
              const isSelected = pkg.id === currentPackageId;
              const rangeStr = getPackagePageRange(pkg, originalIdx);
              const completedCount = pkg.tasks.filter((t) => t.done).length;

              return (
                <div
                  key={pkg.id}
                  onClick={() => onSelectPackage(pkg.id)}
                  className={`p-2 rounded-lg border transition-colors cursor-pointer group flex flex-col justify-between ${
                    isSelected
                      ? 'bg-amber-50/90 border-amber-300 shadow-2xs ring-1 ring-amber-200'
                      : 'bg-white/70 hover:bg-stone-50 border-stone-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-[9px] text-stone-500 font-semibold shrink-0">
                        CH.{String(originalIdx + 1).padStart(2, '0')}
                      </span>
                      <span className="font-serif font-bold text-xs text-stone-900 truncate group-hover:text-amber-900">
                        {pkg.title}
                      </span>
                    </div>
                    <span className="font-mono text-[9px] text-stone-400 shrink-0">
                      {rangeStr}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[9px] font-mono text-stone-500">
                    <div className="flex items-center gap-1">
                      {completedCount > 0 ? (
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      ) : (
                        <Circle className="w-2.5 h-2.5 text-stone-400" />
                      )}
                      <span>할 일 {pkg.tasks.length}건 중 {completedCount}건 완료</span>
                    </div>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[8px] font-sans ${
                        pkg.planStatus === 'confirmed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-stone-100 text-stone-600 border border-stone-200'
                      }`}
                    >
                      {pkg.planStatus === 'confirmed' ? '계획 확정' : '작성 중'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 새 계획 인라인 추가 폼 (선택 날짜 기본 연동) */}
        {isAddingPlan ? (
          <form onSubmit={handleCreateSubmit} className="mt-1 flex gap-1">
            <input
              type="text"
              value={newPlanTitle}
              onChange={(e) => setNewPlanTitle(e.target.value)}
              placeholder={`${selectedDate} 계획 제목 입력...`}
              autoFocus
              className="flex-1 bg-white border border-stone-300 rounded px-2 py-1 text-xs font-serif text-stone-900 outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="px-2.5 py-1 rounded bg-stone-800 text-white text-[10px] font-sans font-medium cursor-pointer"
            >
              추가
            </button>
            <button
              type="button"
              onClick={() => setIsAddingPlan(false)}
              className="px-2 py-1 rounded text-stone-500 hover:text-stone-800 text-[10px] font-sans cursor-pointer"
            >
              취소
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAddingPlan(true)}
            className="w-full mt-1 py-1 rounded border border-dashed border-stone-300 hover:border-stone-400 text-stone-500 hover:text-stone-800 text-[10px] font-sans flex items-center justify-center gap-1 transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3 text-amber-600" />
            <span>이 날짜({selectedDate})에 새 계획 추가하기</span>
          </button>
        )}
      </div>

      {/* ---------------- 4. 하단 선택된 계획 펼치기 액션 ---------------- */}
      <div className="pt-2 border-t border-stone-200 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-mono text-stone-500">
          <span>SELECTED: {selectedPkg ? selectedPkg.title : '선택 없음'}</span>
          <span>ALEPH-06 TOC</span>
        </div>

        <button
          type="button"
          onClick={onTurnPage}
          disabled={disabled}
          className="w-full py-2 px-3 rounded-lg bg-stone-800 hover:bg-stone-900 disabled:bg-stone-400 text-white font-sans text-xs font-medium transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer group active:scale-95"
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
