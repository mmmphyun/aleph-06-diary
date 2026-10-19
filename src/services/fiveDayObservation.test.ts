import { describe, it, expect } from 'vitest';
import { INITIAL_PLAN_PACKAGES } from './initialData';
import {
  calculateDailyCompletionRate,
  calculateFiveDayAverage,
  deduplicateCompletedTasks,
  normalizeOutlierTasks,
  roundToOneDecimal,
  isMondayStartOfWeek,
  generateFiveDayObservationSummary,
  FIVE_DAY_OBSERVATION_DATES,
  RULE_CHANGE_SPEC,
} from './observationMetrics';
import { generateExportData } from '../utils/exportUtils';
import type { TaskItem } from '../types/binder';

describe('마일스톤 M5: 5일 실사용 관찰 기록, 규칙 변경 및 지표 대조 전수 검증 스위트', () => {
  const plan01 = INITIAL_PLAN_PACKAGES.find((p) => p.id === 'plan-01')!;

  describe('1. 5대 예외 처리 규칙 엄격 검증 (T07-C08)', () => {
    it('[규칙 1: 결측치 배제] 예정 할 일이 0건인 날짜는 null로 처리되고, 전체 평균 분모에서 제외된다', () => {
      // 2026-10-01과 2026-10-07은 할 일이 0건인 날짜
      const rateOct01 = calculateDailyCompletionRate(plan01.tasks, '2026-10-01');
      const rateOct07 = calculateDailyCompletionRate(plan01.tasks, '2026-10-07');

      expect(rateOct01).toBeNull();
      expect(rateOct07).toBeNull();

      // 결측치 포함 배열 [66.7, 50.0, null, 75.0]의 평균 계산 시 null은 분모에서 배제됨 (3개 유효 일자로 계산)
      const avg = calculateFiveDayAverage([66.7, 50.0, null, 75.0]);
      // (66.7 + 50.0 + 75.0) / 3 = 191.7 / 3 = 63.9
      expect(avg).toBe(63.9);
    });

    it('[규칙 2: 중복값 멱등성 1건 인정] 동일 taskId에 대해 복수 완료 트리거가 인입되어도 1건으로 멱등 처리된다', () => {
      const duplicateTasks: TaskItem[] = [
        {
          id: 't-dup-01',
          title: '네트워크 소켓 버퍼링',
          done: true,
          status: 'done',
          startDate: '2026-10-02',
          dueDate: '2026-10-02 23:30',
          priority: 'high',
          tags: ['CS'],
          createdAt: '2026-10-02',
        },
        {
          id: 't-dup-01', // 동일 ID 중복 유입
          title: '네트워크 소켓 버퍼링 (재시도 이벤트)',
          done: true,
          status: 'done',
          startDate: '2026-10-02',
          dueDate: '2026-10-02 23:30',
          priority: 'high',
          tags: ['CS'],
          createdAt: '2026-10-02',
        },
      ];

      const deduped = deduplicateCompletedTasks(duplicateTasks);
      expect(deduped.length).toBe(1);
      expect(deduped[0].id).toBe('t-dup-01');

      // 중복이 있더라도 완료율은 1/1 * 100 = 100.0%로 정규화됨 (200% 왜곡 방지)
      const rate = calculateDailyCompletionRate(duplicateTasks, '2026-10-02');
      expect(rate).toBe(100.0);
    });

    it('[규칙 3: 이상치 1건 보정] 10건을 초과하는 극단적 분할 할 일은 단일 작업 1건으로 보정된다', () => {
      // 하루에 12건의 잘게 쪼개진 할 일 생성
      const outlierTasks: TaskItem[] = Array.from({ length: 12 }, (_, i) => ({
        id: `t-micro-${i + 1}`,
        title: `마이크로 태스크 ${i + 1}`,
        done: true,
        status: 'done',
        startDate: '2026-10-08',
        dueDate: '2026-10-08 23:30',
        priority: 'low',
        tags: ['마이크로'],
        estimatedMinutes: 5,
        createdAt: '2026-10-08',
      }));

      const { tasks: normalized, isNormalized } = normalizeOutlierTasks(outlierTasks, 10);
      expect(isNormalized).toBe(true);
      expect(normalized.length).toBe(1);
      expect(normalized[0].title).toContain('[이상치 보정 1건]');
      expect(normalized[0].estimatedMinutes).toBe(60); // 5 * 12 = 60분으로 합산 보정

      const rate = calculateDailyCompletionRate(outlierTasks, '2026-10-08');
      expect(rate).toBe(100.0);
    });

    it('[규칙 4: 반올림 규칙] 소수점 둘째 자리에서 반올림하여 소수점 첫째 자리까지 표기된다', () => {
      // 2/3 = 66.6666...% -> 66.7%
      expect(roundToOneDecimal((2 / 3) * 100)).toBe(66.7);
      // 1/3 = 33.3333...% -> 33.3%
      expect(roundToOneDecimal((1 / 3) * 100)).toBe(33.3);
      // 5/6 = 83.3333...% -> 83.3%
      expect(roundToOneDecimal((5 / 6) * 100)).toBe(83.3);
      // 정수 80 -> 80
      expect(roundToOneDecimal((4 / 5) * 100)).toBe(80.0);
    });

    it('[규칙 5: 월요일 주 시작] ISO-8601 및 시스템 표준에 따라 월요일(Monday)이 새로운 주의 1일차로 식별된다', () => {
      // 2026-10-04 (일요일): 주 시작 아님
      expect(isMondayStartOfWeek('2026-10-04')).toBe(false);
      // 2026-10-05 (월요일, Day 4): 새로운 주의 시작 (Monday)
      expect(isMondayStartOfWeek('2026-10-05')).toBe(true);
      // 2026-10-06 (화요일): 주 시작 아님
      expect(isMondayStartOfWeek('2026-10-06')).toBe(false);
    });
  });

  describe('2. 다이어리 화면상 전체 합계·평균 지표 vs 수동 계산 1:1 대조 (T07-C132)', () => {
    const summary = generateFiveDayObservationSummary(INITIAL_PLAN_PACKAGES);

    it('5일 일별 수치(예정, 완료, 완료율, 시간 오차)가 수동 계산표와 오차 0(정확히 일치)으로 일치한다', () => {
      // Day 1 (2026-10-02, 금) [변경 전: 자유 착수]
      const day1 = summary.dailyMetrics[0];
      expect(day1.dateStr).toBe('2026-10-02');
      expect(day1.scheduledTasksCount).toBe(3); // t-01, t-02, t-07
      expect(day1.completedTasksCount).toBe(2); // t-01, t-02
      expect(day1.completionRate).toBe(66.7); // 2/3 = 66.7%
      expect(day1.totalDiffMinutes).toBe(60); // (+30) + (+30) = +60분
      expect(day1.avgDiffMinutes).toBe(30.0);

      // Day 2 (2026-10-03, 토) [변경 전: 자유 착수]
      const day2 = summary.dailyMetrics[1];
      expect(day2.dateStr).toBe('2026-10-03');
      expect(day2.scheduledTasksCount).toBe(2); // t-03, t-08
      expect(day2.completedTasksCount).toBe(1); // t-03
      expect(day2.completionRate).toBe(50.0); // 1/2 = 50.0%
      expect(day2.totalDiffMinutes).toBe(30); // +30분
      expect(day2.avgDiffMinutes).toBe(30.0);

      // Day 3 (2026-10-04, 일) [변경 후: 30분 블록 고정]
      const day3 = summary.dailyMetrics[2];
      expect(day3.dateStr).toBe('2026-10-04');
      expect(day3.scheduledTasksCount).toBe(3); // t-04, t-09, t-10
      expect(day3.completedTasksCount).toBe(2); // t-09, t-10
      expect(day3.completionRate).toBe(66.7); // 2/3 = 66.7%
      expect(day3.totalDiffMinutes).toBe(0); // 0 + 0 = 0분 (오차 없음)
      expect(day3.avgDiffMinutes).toBe(0.0);

      // Day 4 (2026-10-05, 월) [변경 후: 월요일 주 시작]
      const day4 = summary.dailyMetrics[3];
      expect(day4.dateStr).toBe('2026-10-05');
      expect(day4.isMonday).toBe(true);
      expect(day4.scheduledTasksCount).toBe(4); // t-05, t-11, t-12, t-13
      expect(day4.completedTasksCount).toBe(3); // t-05, t-11, t-12
      expect(day4.completionRate).toBe(75.0); // 3/4 = 75.0%
      expect(day4.totalDiffMinutes).toBe(5); // +5분
      expect(day4.avgDiffMinutes).toBe(1.7); // 5 / 3 = 1.666... -> 1.7분

      // Day 5 (2026-10-06, 화) [변경 후: 30분 블록 고정]
      const day5 = summary.dailyMetrics[4];
      expect(day5.dateStr).toBe('2026-10-06');
      expect(day5.scheduledTasksCount).toBe(3); // t-14, t-15, t-16
      expect(day5.completedTasksCount).toBe(3); // t-14, t-15, t-16
      expect(day5.completionRate).toBe(100.0); // 3/3 = 100.0%
      expect(day5.totalDiffMinutes).toBe(0); // 0분
      expect(day5.avgDiffMinutes).toBe(0.0);
    });

    it('5일 전체 합계 및 평균 지표가 수동 계산과 정확히 오차 0으로 일치한다', () => {
      // 5일 전체 예정 건수: 3 + 2 + 3 + 4 + 3 = 15건
      expect(summary.totals.totalScheduled).toBe(15);

      // 5일 전체 완료 건수: 2 + 1 + 2 + 3 + 3 = 11건
      expect(summary.totals.totalCompleted).toBe(11);

      // 5일 전체 합산 완료율: (11 / 15) * 100 = 73.3333... -> 73.3%
      expect(summary.totals.aggregateCompletionRate).toBe(73.3);

      // 5일 일별 완료율 단순 산술 평균: (66.7 + 50.0 + 66.7 + 75.0 + 100.0) / 5 = 358.4 / 5 = 71.68 -> 71.7%
      expect(summary.totals.simpleAverageCompletionRate).toBe(71.7);

      // 5일 전체 시간 오차 합산: 60 + 30 + 0 + 5 + 0 = 95분
      expect(summary.totals.totalDiffMinutes).toBe(95);

      // 건당 평균 시간 오차: 95 / 11 = 8.6363... -> 8.6분
      expect(summary.totals.avgDiffMinutes).toBe(8.6);
    });

    it('2일차 뒤 ~ 3일차 앞 계획 규칙 변경 기록(타임스탬프, 사유, 변경 전후)이 무결하게 명시되어 있다 (T07-C11)', () => {
      // 규칙 변경 타임스탬프: 2026-10-03T23:45:00+09:00 (Day 2 종료 후, Day 3 착수 전)
      expect(summary.ruleChangeTimestamp).toBe('2026-10-03T23:45:00+09:00');
      expect(summary.ruleChangeReason).toContain('시간 오차 누적');
      expect(summary.ruleChangeReason).toContain('30분 단위 시작 시각 고정');

      // 계획 패키지(plan-01) 내 revision에 규칙 변경 이력이 1회 교정으로 박제되어 있음
      const ruleRevision = plan01.revisions.find((r) => r.id === 'rev-02');
      expect(ruleRevision).toBeDefined();
      expect(ruleRevision?.createdAt).toBe('2026-10-03T23:45:00+09:00');
      expect(ruleRevision?.originalText).toBe(RULE_CHANGE_SPEC.before);
      expect(ruleRevision?.correctedText).toBe(RULE_CHANGE_SPEC.after);
    });

    it('계획 규칙 변경 전(Day 1-2) 대비 변경 후(Day 3-5) 완료율 및 시간 오차 개선이 정량 입증된다 (T07-C15)', () => {
      const { beforeChange, afterChange, completionRateDelta, avgDiffMinutesDelta } =
        summary.phaseComparison;

      // 변경 전 (Day 1-2): 예정 5건 중 3건 완료 -> 60.0%, 평균 시간 오차 +30.0분
      expect(beforeChange.days).toBe(2);
      expect(beforeChange.scheduled).toBe(5);
      expect(beforeChange.completed).toBe(3);
      expect(beforeChange.completionRate).toBe(60.0);
      expect(beforeChange.avgDiffMinutes).toBe(30.0);

      // 변경 후 (Day 3-5): 예정 10건 중 8건 완료 -> 80.0%, 평균 시간 오차 +0.6분
      expect(afterChange.days).toBe(3);
      expect(afterChange.scheduled).toBe(10);
      expect(afterChange.completed).toBe(8);
      expect(afterChange.completionRate).toBe(80.0);
      expect(afterChange.avgDiffMinutes).toBe(0.6);

      // 개선 폭: 완료율 +20.0%p 향상, 시간 오차 -29.4분 대폭 감소 입증!
      expect(completionRateDelta).toBe(20.0);
      expect(avgDiffMinutesDelta).toBe(-29.4);
      expect(completionRateDelta).toBeGreaterThan(0);
      expect(avgDiffMinutesDelta).toBeLessThan(0);
    });
  });

  describe('3. 단일 JSON 파일 내보내기(export.json) 5일 관찰 데이터 무결성 검증 (T07-C133)', () => {
    it('generateExportData 산출물에 5개 일자(Day 1 ~ Day 5)의 모든 태스크(15건)와 로그(11건)가 유실 없이 포함된다', () => {
      const exportData = generateExportData(INITIAL_PLAN_PACKAGES);

      // 1. 기본 메타데이터 검증
      expect(exportData.contractVersion).toBe('2.1.0');
      expect(exportData.exportedAt).toBeTruthy();

      // 2. 계획 패키지 무결성
      expect(exportData.data.plans.length).toBe(2);
      const exportedPlan01 = exportData.data.plans.find((p) => p.id === 'plan-01');
      expect(exportedPlan01).toBeDefined();

      // 3. 리비전 무결성 (rev-02 규칙 변경 포함 2건)
      expect(exportData.data.planRevisions.length).toBe(2);
      const exportedRev02 = exportData.data.planRevisions.find((r) => r.id === 'rev-02');
      expect(exportedRev02?.createdAt).toBe('2026-10-03T23:45:00+09:00');
      expect(exportedRev02?.originalText).toBe(RULE_CHANGE_SPEC.before);
      expect(exportedRev02?.correctedText).toBe(RULE_CHANGE_SPEC.after);

      // 4. 태스크 무결성 (plan-01의 15건 태스크 전수 보존)
      const plan01Tasks = exportData.data.tasks.filter((t) => t.planId === 'plan-01');
      expect(plan01Tasks.length).toBe(15);

      for (const dateStr of FIVE_DAY_OBSERVATION_DATES) {
        const tasksOnDate = plan01Tasks.filter((t) => t.startDate === dateStr);
        expect(tasksOnDate.length).toBeGreaterThan(0);
      }

      // 5. 실행 기록 무결성 (plan-01의 11건 로그 전수 보존)
      const plan01Logs = exportData.data.executionLogs.filter((l) => l.planId === 'plan-01');
      expect(plan01Logs.length).toBe(11);

      // 6. JSON 직렬화 및 역직렬화 라운드트립 무결성
      const jsonString = JSON.stringify(exportData);
      const parsedData = JSON.parse(jsonString);
      expect(parsedData.data.tasks.length).toBe(exportData.data.tasks.length);
      expect(parsedData.data.executionLogs.length).toBe(exportData.data.executionLogs.length);
      expect(parsedData.data.plans.length).toBe(exportData.data.plans.length);
    });
  });
});
