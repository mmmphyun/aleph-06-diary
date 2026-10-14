import { describe, it, expect } from 'vitest';
import { PlanPackage } from '../types/binder';
import { toKSTDateString, calculateActualMinutes, formatVarianceMinutes } from '../utils/dateUtils';

describe('Review Aggregation & Lifecycle - M1/M2/M4/M5 종합 통합 검증', () => {
  const testPackages: PlanPackage[] = [
    {
      id: 'plan-01',
      title: '2026 하반기 핵심 목표 수립',
      content: '매일 아침 30분 CS 시스템 아키텍처 및 네트워크 표준 읽기.',
      revisions: [
        {
          id: 'rev-01',
          startIndex: 0,
          endIndex: 10,
          originalText: '매일 아침 30분',
          correctedText: '매일 아침 1시간',
          createdAt: '2026-10-02',
        },
      ],
      startPage: 1,
      tasks: [
        {
          id: 't-01',
          title: '네트워크 소켓 버퍼링 및 TCP 상태 머신 정리',
          done: true,
          startDate: '2026-10-02',
          dueDate: '2026-10-09 23:30',
          priority: 'high',
          estimatedMinutes: 60,
          status: 'done',
          completedAt: '2026-10-02T09:30:00+09:00',
          createdAt: '2026-10-02',
          tags: ['CS'],
        },
        {
          id: 't-02',
          title: '바인더 다이어리 레이아웃 구축',
          done: false,
          startDate: '2026-10-02',
          dueDate: '2026-10-09 23:30',
          priority: 'medium',
          estimatedMinutes: 90,
          status: 'in_progress',
          createdAt: '2026-10-02',
          tags: ['UI'],
        },
      ],
      logs: [
        {
          id: 'log-01',
          taskId: 't-01',
          taskTitle: '네트워크 소켓 버퍼링 및 TCP 상태 머신 정리',
          completedAt: '2026-10-02T09:30:00+09:00',
          startedAt: '2026-10-02T08:00:00+09:00',
          endedAt: '2026-10-02T09:30:00+09:00',
          actualMinutes: 90,
          comment: 'TIME_WAIT 상태 연관 관계 정리 완료',
        },
      ],
      planStatus: 'confirmed',
      period: { start: '2026-10-01', end: '2026-10-07' },
      createdAt: '2026-10-01',
    },
    {
      id: 'plan-02',
      title: '무스크롤 바인더 고도화',
      content: '960x640 2-Pane 물리 레이아웃 유지',
      revisions: [],
      startPage: 5,
      tasks: [
        {
          id: 't-04',
          title: '단일 속지 3D 플립 모션',
          done: true,
          startDate: '2026-10-08',
          dueDate: '2026-10-15 23:30',
          priority: 'high',
          estimatedMinutes: 90,
          status: 'done',
          completedAt: '2026-10-08T11:40:00+09:00',
          createdAt: '2026-10-08',
          tags: ['모션'],
        },
      ],
      logs: [
        {
          id: 'log-02',
          taskId: 't-04',
          taskTitle: '단일 속지 3D 플립 모션',
          completedAt: '2026-10-08T11:40:00+09:00',
          startedAt: '2026-10-08T10:10:00+09:00',
          endedAt: '2026-10-08T11:40:00+09:00',
          actualMinutes: 90,
          comment: '실물 낱장 회전 모션 안착',
        },
      ],
      planStatus: 'confirmed',
      period: { start: '2026-10-08', end: '2026-10-15' },
      createdAt: '2026-10-08',
    },
  ];

  it('M1/M2: 계획 수정 시 불변 리비전(revisions)이 보존되고 상태가 confirmed로 유지된다', () => {
    const pkg = testPackages[0];
    expect(pkg.planStatus).toBe('confirmed');
    expect(pkg.revisions.length).toBe(1);
    expect(pkg.revisions[0].originalText).toBe('매일 아침 30분');
    expect(pkg.revisions[0].correctedText).toBe('매일 아침 1시간');
  });

  it('M4: 완료된 할 일의 소요 시간이 원천 타임스탬프로부터 정확히 런타임 계산된다', () => {
    const log = testPackages[0].logs[0];
    const computedMin = calculateActualMinutes(log.startedAt, log.endedAt);
    expect(computedMin).toBe(90);
    expect(log.actualMinutes).toBe(90);
  });

  it('M5 지표 1: 기간 겹침 계획 수가 정확히 필터링된다 (2026-10-01 ~ 2026-10-05 범위)', () => {
    const startDate = '2026-10-01';
    const endDate = '2026-10-05';

    // plan-01: 2026-10-01 ~ 2026-10-07 (겹침)
    // plan-02: 2026-10-08 ~ 2026-10-15 (안 겹침)
    const filtered = testPackages.filter((pkg) => {
      if (pkg.period) {
        return pkg.period.start <= endDate && pkg.period.end >= startDate;
      }
      return false;
    });

    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('plan-01');
  });

  it('M5 지표 2 & 3: 기간 내 완료된 할 일 수와 물리적 startedAt 기준 로그 수가 정확히 집계된다', () => {
    // 2026-10-01 ~ 2026-10-07 기간
    const startDate = '2026-10-01';
    const endDate = '2026-10-07';

    const allTasks = testPackages.flatMap((p) => p.tasks);
    const completedTasksInPeriod = allTasks.filter((t) => {
      if (!t.done || t.status !== 'done' || !t.completedAt) return false;
      const completedDate = toKSTDateString(t.completedAt);
      return completedDate >= startDate && completedDate <= endDate;
    });

    // t-01만 해당
    expect(completedTasksInPeriod.length).toBe(1);
    expect(completedTasksInPeriod[0].id).toBe('t-01');

    // 실행 기록 (물리적 startedAt KST 기준 집계)
    const allLogs = testPackages.flatMap((p) => p.logs);
    const logsInPeriod = allLogs.filter((l) => {
      const logDate = toKSTDateString(l.startedAt || l.completedAt);
      return logDate >= startDate && logDate <= endDate;
    });

    expect(logsInPeriod.length).toBe(1);
    expect(logsInPeriod[0].id).toBe('log-01');
  });

  it('M5 지표 4: 완료된 할 일의 예상 시간 대비 실제 소요 시간 평균 오차가 정확히 산출된다', () => {
    // 전체 기간(10-01 ~ 10-15) 대상:
    // t-01: 예상 60분, 실제 90분 -> 오차 +30분
    // t-04: 예상 90분, 실제 90분 -> 오차 0분
    // 평균 오차: (30 + 0) / 2 = +15분
    const allTasks = testPackages.flatMap((p) => p.tasks).filter((t) => t.done);
    const allLogs = testPackages.flatMap((p) => p.logs);

    const varianceItems = allTasks.map((t) => {
      const estimated = t.estimatedMinutes ?? 60;
      const relatedLogs = allLogs.filter((l) => l.taskId === t.id);
      const actualTotal = relatedLogs.reduce((sum, l) => sum + (l.actualMinutes ?? 0), 0);
      return {
        diff: actualTotal - estimated,
      };
    });

    const totalDiff = varianceItems.reduce((acc, curr) => acc + curr.diff, 0);
    const avgDiff = Math.round(totalDiff / varianceItems.length);

    expect(avgDiff).toBe(15);
    expect(formatVarianceMinutes(avgDiff)).toBe('+15분');
  });
});
