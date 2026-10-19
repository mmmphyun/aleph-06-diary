import type { PlanPackage, TaskItem, LogItem } from '../types/binder';
import { toKSTDateString, calculateActualMinutes } from '../utils/dateUtils';

/**
 * 5일 관찰 일별 지표 집계 결과 인터페이스
 */
export interface DailyObservationMetric {
  dateStr: string; // YYYY-MM-DD (Asia/Seoul)
  dayNumber: number; // Day 1 ~ Day 5
  rulePhase: 'BEFORE_CHANGE' | 'AFTER_CHANGE';
  ruleDescription: string;
  scheduledTasksCount: number; // 분모 (해당 일자 예정 할 일 수)
  completedTasksCount: number; // 분자 (해당 일자 완료된 할 일 수, 중복 배제)
  completionRate: number | null; // 계획 실행 완료율 (%), 결측치 시 null
  rawRateText: string;
  totalEstimatedMinutes: number;
  totalActualMinutes: number;
  totalDiffMinutes: number; // 실제 소요 시간 - 예상 소요 시간 (+ drift)
  avgDiffMinutes: number; // 완료 할 일 건당 평균 시간 오차
  isOutlierNormalized: boolean;
  isMissingDay: boolean;
  isMonday: boolean;
  tasks: TaskItem[];
  logs: LogItem[];
}

/**
 * 5일 관찰 종합 분석 리포트 인터페이스
 */
export interface FiveDayObservationSummary {
  observationPeriod: {
    start: string;
    end: string;
  };
  ruleChangeTimestamp: string;
  ruleChangeReason: string;
  ruleChangeText: {
    before: string;
    after: string;
  };
  dailyMetrics: DailyObservationMetric[];
  // 전체 집계 (수동 계산과 1:1 대조 대상)
  totals: {
    totalScheduled: number;
    totalCompleted: number;
    aggregateCompletionRate: number; // 전체 합산 완료율 (totalCompleted / totalScheduled * 100)
    simpleAverageCompletionRate: number; // 일별 완료율 산술 평균 (결측치 제외)
    totalDiffMinutes: number;
    avgDiffMinutes: number;
  };
  // 규칙 변경 전후 비교
  phaseComparison: {
    beforeChange: {
      days: number;
      scheduled: number;
      completed: number;
      completionRate: number;
      avgDiffMinutes: number;
    };
    afterChange: {
      days: number;
      scheduled: number;
      completed: number;
      completionRate: number;
      avgDiffMinutes: number;
    };
    completionRateDelta: number; // 향상 폭 (%p)
    avgDiffMinutesDelta: number; // 오차 감소 폭 (분)
  };
}

/**
 * [규칙 4] 소수점 둘째 자리에서 반올림하여 소수점 첫째 자리까지 산출
 * (예: 66.6666... -> 66.7, 50 -> 50.0)
 */
export function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * [규칙 5] 월요일 주 시작 여부 판별
 * - ISO-8601 및 시스템 표준: 주의 시작은 월요일(Monday, Day 1)
 */
export function isMondayStartOfWeek(dateStr: string): boolean {
  // Asia/Seoul KST 09:00 기준 Date 파싱
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  // getUTCDay: 0(일), 1(월), 2(화), 3(수), 4(목), 5(금), 6(토)
  return date.getUTCDay() === 1;
}

/**
 * [규칙 3] 이상치(Outlier) 1건 보정
 * - 특정 일자의 계획 할 일 수가 10건을 초과하는 극단적 분할은 본래 단일 작업 1건으로 묶어 보정
 */
export function normalizeOutlierTasks(tasks: TaskItem[], threshold = 10): { tasks: TaskItem[]; isNormalized: boolean } {
  if (tasks.length <= threshold) {
    return { tasks, isNormalized: false };
  }

  // 10건 초과 시: 첫 번째 작업의 속성을 계승한 1건의 대표 작업으로 축약 보정
  const baseTask = tasks[0];
  const allDone = tasks.every((t) => t.done && t.status === 'done');
  const normalizedTask: TaskItem = {
    ...baseTask,
    id: `${baseTask.id}-normalized-bundle`,
    title: `[이상치 보정 1건] ${baseTask.title} 외 ${tasks.length - 1}건 종합`,
    done: allDone,
    status: allDone ? 'done' : 'in_progress',
    estimatedMinutes: tasks.reduce((sum, t) => sum + (t.estimatedMinutes ?? 60), 0),
    completedAt: allDone ? baseTask.completedAt : null,
  };

  return { tasks: [normalizedTask], isNormalized: true };
}

/**
 * [규칙 2] 중복값 멱등성 1건 인정
 * - 동일 taskId에 대해 복수의 완료 트리거가 인입되더라도 고유 1건의 완료로만 인정
 */
export function deduplicateCompletedTasks(tasks: TaskItem[]): TaskItem[] {
  const seenIds = new Set<string>();
  const deduped: TaskItem[] = [];

  for (const t of tasks) {
    if (!seenIds.has(t.id)) {
      seenIds.add(t.id);
      deduped.push(t);
    }
  }

  return deduped;
}

/**
 * [규칙 1~5 통합] 특정 일자의 계획 실행 완료율(%) 계산 함수
 * - 시그니처: calculateDailyCompletionRate(tasks: TaskItem[], dateStr: string): number | null
 * - 규칙 1 (결측치): 해당 일자 예정 할 일이 0건인 경우 null 반환 (분모 제외)
 * - 규칙 2 (중복값): 동일 taskId 중복 시 1건만 반영
 * - 규칙 3 (이상치): 10건 초과 시 단일 작업 1건으로 보정
 * - 규칙 4 (반올림): 소수점 둘째 자리 반올림하여 소수점 첫째 자리 number 반환
 */
export function calculateDailyCompletionRate(
  tasks: TaskItem[],
  dateStr: string
): number | null {
  // 1. 해당 일자에 속하는 활성(휴지통 제외) 할 일 필터링
  const rawTasksOnDate = tasks.filter((t) => {
    if (t.trashStatus === 1) return false;
    return t.startDate === dateStr;
  });

  // [규칙 1: 결측치 배제] 계획된 할 일이 0건이면 결측(null) 처리
  if (rawTasksOnDate.length === 0) {
    return null;
  }

  // [규칙 2: 중복값 멱등성 보장]
  const dedupedTasks = deduplicateCompletedTasks(rawTasksOnDate);

  // [규칙 3: 이상치 보정]
  const { tasks: effectiveTasks } = normalizeOutlierTasks(dedupedTasks, 10);

  const scheduledCount = effectiveTasks.length;
  const completedCount = effectiveTasks.filter(
    (t) => t.done && t.status === 'done'
  ).length;

  if (scheduledCount === 0) return null;

  // [규칙 4: 소수점 둘째 자리 반올림]
  const rawRate = (completedCount / scheduledCount) * 100;
  return roundToOneDecimal(rawRate);
}

/**
 * [규칙 1 연계] 5일 일별 완료율의 단순 산술 평균 계산 (결측치 null 배제)
 */
export function calculateFiveDayAverage(dailyRates: Array<number | null>): number | null {
  const validRates = dailyRates.filter((r): r is number => r !== null);
  if (validRates.length === 0) return null;

  const sum = validRates.reduce((acc, curr) => acc + curr, 0);
  return roundToOneDecimal(sum / validRates.length);
}

/**
 * 5일 실사용 관찰 일자 목록 (Asia/Seoul 기준 서로 다른 5개 일자)
 */
export const FIVE_DAY_OBSERVATION_DATES = [
  '2026-10-02', // Day 1 (금) - 기존 규칙
  '2026-10-03', // Day 2 (토) - 기존 규칙
  '2026-10-04', // Day 3 (일) - 변경 규칙 적용
  '2026-10-05', // Day 4 (월) - 변경 규칙 적용 (월요일 주 시작!)
  '2026-10-06', // Day 5 (화) - 변경 규칙 적용
] as const;

export const RULE_CHANGE_SPEC = {
  timestamp: '2026-10-03T23:45:00+09:00',
  before: '마감 시각(23:30 KST) 전까지 완료하면 자유롭게 시작/종료를 기록함.',
  after: '할 일 착수 시 반드시 30분 단위 블록으로 시작 시각을 고정하고, 10분 이상 지연 시 사유를 기록함.',
  reason: 'Day 1(66.7%) 및 Day 2(50.0%)에서 착수 시각 불규칙으로 인한 시간 오차 누적(+30분) 및 마감 직전 착수 실패로 인한 일간 완료율 저하를 방지하기 위해 30분 단위 시작 시각 고정 규칙을 도입함.',
};

/**
 * 5일 실사용 관찰 패키지로부터 종합 분석 리포트 산출
 */
export function generateFiveDayObservationSummary(packages: PlanPackage[]): FiveDayObservationSummary {
  const activePackages = packages.filter((p) => p.trashStatus !== 1);
  const allTasks = activePackages.flatMap((p) => p.tasks).filter((t) => t.trashStatus !== 1);
  const allLogs = activePackages.flatMap((p) => p.logs).filter((l) => l.trashStatus !== 1);

  const dailyMetrics: DailyObservationMetric[] = FIVE_DAY_OBSERVATION_DATES.map((dateStr, index) => {
    const dayNumber = index + 1;
    const isBefore = dayNumber <= 2;
    const rulePhase = isBefore ? 'BEFORE_CHANGE' : 'AFTER_CHANGE';
    const ruleDescription = isBefore ? RULE_CHANGE_SPEC.before : RULE_CHANGE_SPEC.after;

    const rawTasks = allTasks.filter((t) => t.startDate === dateStr);
    const { tasks: effectiveTasks, isNormalized } = normalizeOutlierTasks(
      deduplicateCompletedTasks(rawTasks),
      10
    );

    const isMissingDay = effectiveTasks.length === 0;
    const scheduledTasksCount = effectiveTasks.length;
    const completedTasks = effectiveTasks.filter((t) => t.done && t.status === 'done');
    const completedTasksCount = completedTasks.length;

    const completionRate = calculateDailyCompletionRate(allTasks, dateStr);

    // 해당 일자 완료 할 일들의 시간 오차 분석
    const dayLogs = allLogs.filter((log) => {
      const logDate = toKSTDateString(log.startedAt || log.completedAt);
      return logDate === dateStr;
    });

    let totalEstimated = 0;
    let totalActual = 0;
    let totalDiff = 0;

    for (const task of completedTasks) {
      const est = task.estimatedMinutes ?? 60;
      totalEstimated += est;
      const relatedLogs = dayLogs.filter((l) => l.taskId === task.id);
      const act = relatedLogs.reduce((sum, l) => {
        const m = typeof l.actualMinutes === 'number'
          ? l.actualMinutes
          : calculateActualMinutes(l.startedAt, l.endedAt);
        return sum + m;
      }, 0);
      totalActual += act;
      totalDiff += (act - est);
    }

    const avgDiff = completedTasksCount > 0 ? roundToOneDecimal(totalDiff / completedTasksCount) : 0;

    return {
      dateStr,
      dayNumber,
      rulePhase,
      ruleDescription,
      scheduledTasksCount,
      completedTasksCount,
      completionRate,
      rawRateText: scheduledTasksCount > 0 ? `${completedTasksCount}/${scheduledTasksCount}` : '결측 (0/0)',
      totalEstimatedMinutes: totalEstimated,
      totalActualMinutes: totalActual,
      totalDiffMinutes: totalDiff,
      avgDiffMinutes: avgDiff,
      isOutlierNormalized: isNormalized,
      isMissingDay,
      isMonday: isMondayStartOfWeek(dateStr),
      tasks: effectiveTasks,
      logs: dayLogs,
    };
  });

  // 전체 집계
  const totalScheduled = dailyMetrics.reduce((sum, m) => sum + m.scheduledTasksCount, 0);
  const totalCompleted = dailyMetrics.reduce((sum, m) => sum + m.completedTasksCount, 0);
  const aggregateCompletionRate = totalScheduled > 0
    ? roundToOneDecimal((totalCompleted / totalScheduled) * 100)
    : 0;

  const validRates = dailyMetrics.map((m) => m.completionRate);
  const simpleAverageCompletionRate = calculateFiveDayAverage(validRates) ?? 0;

  const totalDiffMinutes = dailyMetrics.reduce((sum, m) => sum + m.totalDiffMinutes, 0);
  const avgDiffMinutes = totalCompleted > 0 ? roundToOneDecimal(totalDiffMinutes / totalCompleted) : 0;

  // 규칙 변경 전 (Day 1-2)
  const beforeDays = dailyMetrics.filter((m) => m.rulePhase === 'BEFORE_CHANGE');
  const beforeScheduled = beforeDays.reduce((sum, m) => sum + m.scheduledTasksCount, 0);
  const beforeCompleted = beforeDays.reduce((sum, m) => sum + m.completedTasksCount, 0);
  const beforeRate = beforeScheduled > 0 ? roundToOneDecimal((beforeCompleted / beforeScheduled) * 100) : 0;
  const beforeDiff = beforeDays.reduce((sum, m) => sum + m.totalDiffMinutes, 0);
  const beforeAvgDiff = beforeCompleted > 0 ? roundToOneDecimal(beforeDiff / beforeCompleted) : 0;

  // 규칙 변경 후 (Day 3-5)
  const afterDays = dailyMetrics.filter((m) => m.rulePhase === 'AFTER_CHANGE');
  const afterScheduled = afterDays.reduce((sum, m) => sum + m.scheduledTasksCount, 0);
  const afterCompleted = afterDays.reduce((sum, m) => sum + m.completedTasksCount, 0);
  const afterRate = afterScheduled > 0 ? roundToOneDecimal((afterCompleted / afterScheduled) * 100) : 0;
  const afterDiff = afterDays.reduce((sum, m) => sum + m.totalDiffMinutes, 0);
  const afterAvgDiff = afterCompleted > 0 ? roundToOneDecimal(afterDiff / afterCompleted) : 0;

  return {
    observationPeriod: {
      start: FIVE_DAY_OBSERVATION_DATES[0],
      end: FIVE_DAY_OBSERVATION_DATES[4],
    },
    ruleChangeTimestamp: RULE_CHANGE_SPEC.timestamp,
    ruleChangeReason: RULE_CHANGE_SPEC.reason,
    ruleChangeText: {
      before: RULE_CHANGE_SPEC.before,
      after: RULE_CHANGE_SPEC.after,
    },
    dailyMetrics,
    totals: {
      totalScheduled,
      totalCompleted,
      aggregateCompletionRate,
      simpleAverageCompletionRate,
      totalDiffMinutes,
      avgDiffMinutes,
    },
    phaseComparison: {
      beforeChange: {
        days: beforeDays.length,
        scheduled: beforeScheduled,
        completed: beforeCompleted,
        completionRate: beforeRate,
        avgDiffMinutes: beforeAvgDiff,
      },
      afterChange: {
        days: afterDays.length,
        scheduled: afterScheduled,
        completed: afterCompleted,
        completionRate: afterRate,
        avgDiffMinutes: afterAvgDiff,
      },
      completionRateDelta: roundToOneDecimal(afterRate - beforeRate),
      avgDiffMinutesDelta: roundToOneDecimal(afterAvgDiff - beforeAvgDiff),
    },
  };
}
