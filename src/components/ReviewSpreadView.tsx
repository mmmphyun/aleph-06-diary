import React, { useState, useMemo } from 'react';
import { PlanPackage } from '../types/binder';
import {
  toKSTDateString,
  formatActualMinutes,
  formatVarianceMinutes,
  calculateActualMinutes,
  getTodayKST,
} from '../utils/dateUtils';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
} from 'lucide-react';

export type ReviewDetailTarget = 'plans' | 'doneTasks' | 'logs' | 'timeVariance';

interface ReviewSpreadViewProps {
  packages: PlanPackage[];
  onSelectPackage?: (pkgId: string) => void;
  onNavigateToSection?: (pkgId: string, spreadIndex: number) => void;
}

export const ReviewSpreadView: React.FC<ReviewSpreadViewProps> = ({
  packages,
  onSelectPackage,
  onNavigateToSection,
}) => {
  const today = getTodayKST();

  // 날짜 범위 상태 (기본값: 이번 달 1일 ~ 오늘)
  const [startDate, setStartDate] = useState<string>('2026-10-01');
  const [endDate, setEndDate] = useState<string>(today || '2026-10-31');

  // 활성화된 상세 뷰 타깃 ('plans' | 'doneTasks' | 'logs' | 'timeVariance')
  const [activeDetailTarget, setActiveDetailTarget] = useState<ReviewDetailTarget>('plans');

  // 상세 뷰 페이지네이션 (1페이지당 4건 무스크롤 보장)
  const [detailPage, setDetailPage] = useState<number>(0);

  // 타깃 변경 시 페이지네이션 초기화
  const handleSelectTarget = (target: ReviewDetailTarget) => {
    setActiveDetailTarget(target);
    setDetailPage(0);
  };

  // 1. 기간 내 계획 필터링 (선택 기간과 period가 겹치는 유효 계획, trashStatus === 1 제외)
  const filteredPlans = useMemo(() => {
    return packages.filter((pkg) => {
      if (pkg.trashStatus === 1) return false;
      if (pkg.period) {
        return pkg.period.start <= endDate && pkg.period.end >= startDate;
      }
      const createdDate = toKSTDateString(pkg.createdAt);
      return createdDate >= startDate && createdDate <= endDate;
    });
  }, [packages, startDate, endDate]);

  // 모든 활성 할 일 평탄화 및 부모 계획 정보 매핑 (휴지통 데이터 제외)
  const allTasksWithPlan = useMemo(() => {
    return packages
      .filter((pkg) => pkg.trashStatus !== 1)
      .flatMap((pkg) =>
        pkg.tasks
          .filter((task) => task.trashStatus !== 1)
          .map((task) => ({
            ...task,
            planId: pkg.id,
            planTitle: pkg.title,
          }))
      );
  }, [packages]);

  // 모든 활성 실행 기록 평탄화 및 부모 정보 매핑 (휴지통 데이터 제외)
  const allLogsWithPlan = useMemo(() => {
    return packages
      .filter((pkg) => pkg.trashStatus !== 1)
      .flatMap((pkg) =>
        pkg.logs
          .filter((log) => log.trashStatus !== 1)
          .map((log) => ({
            ...log,
            planId: pkg.id,
            planTitle: pkg.title,
          }))
      );
  }, [packages]);

  // 2. 기간 내 완료된 할 일 (선택 기간 내 completedAt이 속하는 현재 done === true 할 일)
  const doneTasksInPeriod = useMemo(() => {
    return allTasksWithPlan.filter((t) => {
      if (!t.done || t.status !== 'done' || !t.completedAt) return false;
      const completedDate = toKSTDateString(t.completedAt);
      return completedDate >= startDate && completedDate <= endDate;
    });
  }, [allTasksWithPlan, startDate, endDate]);

  // 3. 기간 내 실행 기록 (물리적 시작 일시 startedAt KST 기준)
  const logsInPeriod = useMemo(() => {
    return allLogsWithPlan.filter((log) => {
      const logDate = toKSTDateString(log.startedAt || log.completedAt);
      return logDate >= startDate && logDate <= endDate;
    });
  }, [allLogsWithPlan, startDate, endDate]);

  // 4. 완료된 할 일별 예상 대비 실제 시간 차이 분석
  const timeVarianceAnalysis = useMemo(() => {
    const items = doneTasksInPeriod
      .map((task) => {
        const estimated = task.estimatedMinutes ?? 60;
        // 연결된 실행 기록들의 actualMinutes 합산
        const relatedLogs = allLogsWithPlan.filter((l) => l.taskId === task.id);
        const actualTotal = relatedLogs.reduce((acc, curr) => {
          const min =
            typeof curr.actualMinutes === 'number'
              ? curr.actualMinutes
              : calculateActualMinutes(curr.startedAt, curr.endedAt);
          return acc + min;
        }, 0);

        const diffMinutes = actualTotal - estimated;
        return {
          task,
          relatedLogs,
          estimatedMinutes: estimated,
          actualMinutes: actualTotal,
          diffMinutes,
        };
      })
      .filter((item) => item.relatedLogs.length > 0);

    const totalDiff = items.reduce((acc, curr) => acc + curr.diffMinutes, 0);
    const avgDiff = items.length > 0 ? Math.round(totalDiff / items.length) : 0;

    return {
      items,
      avgDiff,
      count: items.length,
    };
  }, [doneTasksInPeriod, allLogsWithPlan]);

  // 퀵 프리셋 핸들러
  const handlePresetRange = (preset: 'thisMonth' | 'last7Days' | 'all') => {
    const todayStr = getTodayKST();
    if (preset === 'thisMonth') {
      const [y, m] = todayStr.split('-');
      setStartDate(`${y}-${m}-01`);
      setEndDate(todayStr);
    } else if (preset === 'last7Days') {
      const now = new Date();
      now.setDate(now.getDate() - 6);
      const pastY = now.getFullYear();
      const pastM = String(now.getMonth() + 1).padStart(2, '0');
      const pastD = String(now.getDate()).padStart(2, '0');
      setStartDate(`${pastY}-${pastM}-${pastD}`);
      setEndDate(todayStr);
    } else if (preset === 'all') {
      setStartDate('2026-01-01');
      setEndDate('2026-12-31');
    }
    setDetailPage(0);
  };

  const PAGE_SIZE = 4;

  return (
    <div className="w-full h-full flex select-none">
      {/* ========================================================================= */}
      {/* [좌측 480px: 날짜 범위 달력 필터 & 4대 핵심 지표 요약 카드] */}
      {/* ========================================================================= */}
      <div
        className="w-[480px] h-full p-6 flex flex-col justify-between border-r border-stone-200"
        style={{ backgroundColor: 'var(--color-paper)' }}
      >
        <div className="flex flex-col gap-4">
          {/* 상단 헤더 */}
          <div className="flex items-center justify-between pb-2 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-stone-700" />
              <span className="font-mono text-xs font-semibold text-stone-700 tracking-wider">
                ALEPH-06 REVIEW
              </span>
            </div>
            <span className="font-mono text-[11px] text-stone-400">REVIEW P.01</span>
          </div>

          {/* 타이틀 */}
          <div>
            <div className="font-serif text-xl font-bold text-stone-800">
              기록과 실행의 궤적
            </div>
            <p className="font-sans text-xs text-stone-500 mt-1 leading-relaxed">
              선택한 기간 동안의 계획, 실행, 시간 오차를 동적으로 집계합니다.
            </p>
          </div>

          {/* 날짜 범위 달력 필터 바 */}
          <div className="p-3 bg-white/80 rounded-lg border border-stone-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-[11px] font-sans font-medium text-stone-600">
              <span className="flex items-center gap-1">
                <CalendarIcon className="w-3.5 h-3.5 text-stone-500" />
                분석 기간 설정
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handlePresetRange('last7Days')}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors cursor-pointer"
                >
                  최근 7일
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetRange('thisMonth')}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors cursor-pointer"
                >
                  이번 달
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetRange('all')}
                  className="px-1.5 py-0.5 rounded text-[10px] bg-stone-100 hover:bg-stone-200 text-stone-600 transition-colors cursor-pointer"
                >
                  전체
                </button>
              </div>
            </div>

            {/* 시작일 ~ 종료일 선택기 */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-stone-400 font-mono mb-0.5">START</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setDetailPage(0);
                  }}
                  className="px-2 py-1 bg-stone-50 border border-stone-300 rounded text-xs font-mono text-stone-700 focus:outline-none focus:border-stone-500"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-stone-400 font-mono mb-0.5">END</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setDetailPage(0);
                  }}
                  className="px-2 py-1 bg-stone-50 border border-stone-300 rounded text-xs font-mono text-stone-700 focus:outline-none focus:border-stone-500"
                />
              </div>
            </div>
          </div>

          {/* 4대 핵심 지표 2x2 카드 그리드 */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* 1. 계획 수 카드 */}
            <div
              onClick={() => handleSelectTarget('plans')}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                activeDetailTarget === 'plans'
                  ? 'bg-amber-50/70 border-amber-600 ring-2 ring-amber-400/30 shadow-xs'
                  : 'bg-white/80 border-stone-200 hover:bg-stone-50 hover:border-stone-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-[11px] font-sans font-medium">기간 내 계획 수</span>
                <FileText className="w-3.5 h-3.5 text-stone-400" />
              </div>
              <div className="text-2xl font-bold font-mono text-stone-800 mt-1">
                {filteredPlans.length}
                <span className="text-xs font-normal text-stone-500 ml-1">건</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-stone-400 mt-1">
                <span>클릭 시 계획 목록</span>
                <ArrowUpRight className="w-2.5 h-2.5" />
              </div>
            </div>

            {/* 2. 완료 할 일 수 카드 */}
            <div
              onClick={() => handleSelectTarget('doneTasks')}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                activeDetailTarget === 'doneTasks'
                  ? 'bg-emerald-50/70 border-emerald-600 ring-2 ring-emerald-400/30 shadow-xs'
                  : 'bg-white/80 border-stone-200 hover:bg-stone-50 hover:border-stone-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-[11px] font-sans font-medium">완료된 할 일</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                {doneTasksInPeriod.length}
                <span className="text-xs font-normal text-stone-500 ml-1">건</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-stone-400 mt-1">
                <span>클릭 시 완료 목록</span>
                <ArrowUpRight className="w-2.5 h-2.5" />
              </div>
            </div>

            {/* 3. 실행 기록 수 카드 */}
            <div
              onClick={() => handleSelectTarget('logs')}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                activeDetailTarget === 'logs'
                  ? 'bg-blue-50/70 border-blue-600 ring-2 ring-blue-400/30 shadow-xs'
                  : 'bg-white/80 border-stone-200 hover:bg-stone-50 hover:border-stone-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-[11px] font-sans font-medium">실행 기록</span>
                <Clock className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-blue-700 mt-1">
                {logsInPeriod.length}
                <span className="text-xs font-normal text-stone-500 ml-1">건</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-stone-400 mt-1">
                <span>클릭 시 타임라인</span>
                <ArrowUpRight className="w-2.5 h-2.5" />
              </div>
            </div>

            {/* 4. 평균 시간 차이 카드 */}
            <div
              onClick={() => handleSelectTarget('timeVariance')}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                activeDetailTarget === 'timeVariance'
                  ? 'bg-purple-50/70 border-purple-600 ring-2 ring-purple-400/30 shadow-xs'
                  : 'bg-white/80 border-stone-200 hover:bg-stone-50 hover:border-stone-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-stone-500">
                <span className="text-[11px] font-sans font-medium">평균 시간 차이</span>
                <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <div className="text-2xl font-bold font-mono text-purple-700 mt-1">
                {formatVarianceMinutes(timeVarianceAnalysis.avgDiff)}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-stone-400 mt-1">
                <span>클릭 시 시간 대조표</span>
                <ArrowUpRight className="w-2.5 h-2.5" />
              </div>
            </div>
          </div>
        </div>

        {/* 좌측 푸터 */}
        <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono text-stone-400">
          <span>ALEPH-06 REVIEW</span>
          <span>REVIEW P.01</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* [우측 480px: 선택된 집계 숫자 상세 네비게이션 뷰 (무스크롤 4개 제한)] */}
      {/* ========================================================================= */}
      <div
        className="w-[480px] h-full p-6 flex flex-col justify-between"
        style={{ backgroundColor: 'var(--color-paper)' }}
      >
        <div className="flex flex-col h-full justify-between">
          <div>
            {/* 우측 상단 헤더 */}
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <span className="font-mono text-xs font-semibold text-stone-700">
                {activeDetailTarget === 'plans' && 'FILTERED PLANS'}
                {activeDetailTarget === 'doneTasks' && 'COMPLETED TASKS'}
                {activeDetailTarget === 'logs' && 'EXECUTION TIMELINE'}
                {activeDetailTarget === 'timeVariance' && 'TIME VARIANCE DETAIL'}
              </span>
              <span className="font-mono text-[11px] text-stone-400">REVIEW P.02</span>
            </div>

            {/* 타깃별 서브 배너 */}
            <div className="py-2 flex items-center justify-between text-xs text-stone-600 border-b border-stone-100">
              <span className="font-sans font-medium">
                {activeDetailTarget === 'plans' && `기간 내 계획 (${filteredPlans.length}건)`}
                {activeDetailTarget === 'doneTasks' && `완료된 할 일 (${doneTasksInPeriod.length}건)`}
                {activeDetailTarget === 'logs' && `실행 기록 (${logsInPeriod.length}건)`}
                {activeDetailTarget === 'timeVariance' && `시간 대조 항목 (${timeVarianceAnalysis.count}건)`}
              </span>
              <span className="text-[10px] font-mono text-stone-400">
                {startDate} ~ {endDate}
              </span>
            </div>

            {/* ---------------- 1. 계획 목록 뷰 ---------------- */}
            {activeDetailTarget === 'plans' && (
              <div className="mt-3 space-y-2">
                {filteredPlans.length === 0 ? (
                  <div className="py-12 text-center text-stone-400 font-sans text-xs">
                    선택 기간과 겹치는 계획이 없습니다.
                  </div>
                ) : (
                  filteredPlans
                    .slice(detailPage * PAGE_SIZE, (detailPage + 1) * PAGE_SIZE)
                    .map((pkg) => (
                      <div
                        key={pkg.id}
                        onClick={() => {
                          onSelectPackage?.(pkg.id);
                          onNavigateToSection?.(pkg.id, 0);
                        }}
                        className="p-2.5 rounded-lg bg-white border border-stone-200 hover:border-amber-400 hover:shadow-xs transition-colors cursor-pointer flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-serif text-xs font-bold text-stone-800 truncate max-w-[280px]">
                            {pkg.title}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                              pkg.planStatus === 'confirmed'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-stone-100 text-stone-600'
                            }`}
                          >
                            {pkg.planStatus === 'confirmed' ? '확정' : '작성중'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-stone-500">
                          <span>
                            {pkg.period?.start || pkg.createdAt} ~ {pkg.period?.end || pkg.createdAt}
                          </span>
                          <span>
                            할 일 {pkg.tasks.filter((t) => t.done).length}/{pkg.tasks.length}건 완료
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}

            {/* ---------------- 2. 완료 할 일 목록 뷰 ---------------- */}
            {activeDetailTarget === 'doneTasks' && (
              <div className="mt-3 space-y-2">
                {doneTasksInPeriod.length === 0 ? (
                  <div className="py-12 text-center text-stone-400 font-sans text-xs">
                    선택 기간 내에 완료된 할 일이 없습니다.
                  </div>
                ) : (
                  doneTasksInPeriod
                    .slice(detailPage * PAGE_SIZE, (detailPage + 1) * PAGE_SIZE)
                    .map((task) => (
                      <div
                        key={task.id}
                        onClick={() => {
                          onSelectPackage?.(task.planId);
                          onNavigateToSection?.(task.planId, 1);
                        }}
                        className="p-2.5 rounded-lg bg-white border border-stone-200 hover:border-emerald-400 hover:shadow-xs transition-colors cursor-pointer flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-sans text-xs font-semibold text-stone-800 truncate max-w-[280px]">
                            {task.title}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-100 text-emerald-800">
                            완료
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-stone-500">
                          <span className="text-[10px] text-stone-400 font-sans truncate max-w-[200px]">
                            {task.planTitle}
                          </span>
                          <span className="font-mono text-[10px] text-stone-400">
                            {task.completedAt ? task.completedAt.substring(0, 16).replace('T', ' ') : ''}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}

            {/* ---------------- 3. 실행 기록 타임라인 뷰 ---------------- */}
            {activeDetailTarget === 'logs' && (
              <div className="mt-3 space-y-2">
                {logsInPeriod.length === 0 ? (
                  <div className="py-12 text-center text-stone-400 font-sans text-xs">
                    선택 기간 내에 기록된 실행 일지가 없습니다.
                  </div>
                ) : (
                  logsInPeriod
                    .slice(detailPage * PAGE_SIZE, (detailPage + 1) * PAGE_SIZE)
                    .map((log) => {
                      const actualMin =
                        typeof log.actualMinutes === 'number'
                          ? log.actualMinutes
                          : calculateActualMinutes(log.startedAt, log.endedAt);
                      return (
                        <div
                          key={log.id}
                          onClick={() => {
                            onSelectPackage?.(log.planId);
                            onNavigateToSection?.(log.planId, 2);
                          }}
                          className="p-2.5 rounded-lg bg-white border border-stone-200 hover:border-blue-400 hover:shadow-xs transition-colors cursor-pointer flex flex-col gap-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-sans text-xs font-semibold text-stone-800 truncate max-w-[280px]">
                              {log.taskTitle}
                            </span>
                            <span className="font-mono text-[11px] text-blue-700 font-bold">
                              {formatActualMinutes(actualMin)}
                            </span>
                          </div>
                          {log.comment && (
                            <p className="text-[11px] font-sans text-stone-600 line-clamp-1 italic">
                              "{log.comment}"
                            </p>
                          )}
                          <div className="flex items-center justify-between text-[10px] font-mono text-stone-400">
                            <span>
                              {log.startedAt ? log.startedAt.substring(11, 16) : ''} ~{' '}
                              {log.endedAt ? log.endedAt.substring(11, 16) : ''}
                            </span>
                            <span className="truncate max-w-[150px] font-sans">{log.planTitle}</span>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            )}

            {/* ---------------- 4. 시간 오차 상세 대조 뷰 ---------------- */}
            {activeDetailTarget === 'timeVariance' && (
              <div className="mt-3 space-y-2">
                {timeVarianceAnalysis.items.length === 0 ? (
                  <div className="py-12 text-center text-stone-400 font-sans text-xs">
                    대조 대상인 완료 할 일과 실행 기록이 없습니다.
                  </div>
                ) : (
                  timeVarianceAnalysis.items
                    .slice(detailPage * PAGE_SIZE, (detailPage + 1) * PAGE_SIZE)
                    .map((item) => (
                      <div
                        key={item.task.id}
                        onClick={() => {
                          onSelectPackage?.(item.task.planId);
                          onNavigateToSection?.(item.task.planId, 2);
                        }}
                        className="p-2.5 rounded-lg bg-white border border-stone-200 hover:border-purple-400 hover:shadow-xs transition-colors cursor-pointer flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-sans text-xs font-semibold text-stone-800 truncate max-w-[260px]">
                            {item.task.title}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                              item.diffMinutes > 0
                                ? 'bg-amber-100 text-amber-800'
                                : item.diffMinutes < 0
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            오차 {formatVarianceMinutes(item.diffMinutes)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-mono text-stone-500">
                          <span>예상: {formatActualMinutes(item.estimatedMinutes)}</span>
                          <span>실제: {formatActualMinutes(item.actualMinutes)}</span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}
          </div>

          {/* 우측 페이지네이션 컨트롤 (무스크롤 보장) */}
          <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
            {/* 페이지네이션 버튼 */}
            {(() => {
              const currentTotal =
                activeDetailTarget === 'plans'
                  ? filteredPlans.length
                  : activeDetailTarget === 'doneTasks'
                  ? doneTasksInPeriod.length
                  : activeDetailTarget === 'logs'
                  ? logsInPeriod.length
                  : timeVarianceAnalysis.items.length;
              const totalPages = Math.max(1, Math.ceil(currentTotal / PAGE_SIZE));

              return (
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={detailPage === 0}
                      onClick={() => setDetailPage((p) => Math.max(0, p - 1))}
                      className="p-1 rounded text-stone-500 hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[11px] font-mono text-stone-500">
                      {detailPage + 1} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={detailPage >= totalPages - 1}
                      onClick={() => setDetailPage((p) => Math.min(totalPages - 1, p + 1))}
                      className="p-1 rounded text-stone-500 hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="font-mono text-[10px] text-stone-400">REVIEW P.02</span>
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
