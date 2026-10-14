import { describe, it, expect } from 'vitest';
import { compareTasksDeterministic, queryTasks } from './taskFilterSort';
import { TaskItem } from '../types/binder';

describe('taskFilterSort - M3 할 일 정렬 및 필터 파이프라인 검증', () => {
  const sampleTasks: TaskItem[] = [
    {
      id: 't-03',
      title: '아키텍처 문서화',
      done: false,
      startDate: '2026-10-02',
      dueDate: '2026-10-09 23:30',
      priority: 'low',
      description: 'C4 모델 시스템 다이어그램 작성',
      tags: ['문서'],
      status: 'todo',
      createdAt: '2026-10-02',
    },
    {
      id: 't-01',
      title: '네트워크 소켓 버퍼링 분석',
      done: true,
      startDate: '2026-10-02',
      dueDate: '2026-10-09 23:30',
      priority: 'high',
      description: 'TIME_WAIT 상태 및 SO_REUSEADDR 분석',
      tags: ['CS', '네트워크'],
      status: 'done',
      completedAt: '2026-10-02T09:30:00+09:00',
      createdAt: '2026-10-02',
    },
    {
      id: 't-02',
      title: '바인더 다이어리 레이아웃 구축',
      done: false,
      startDate: '2026-10-02',
      dueDate: '2026-10-09 23:30',
      priority: 'medium',
      description: '960x640 2-Pane 물리 레이아웃',
      tags: ['UI'],
      status: 'in_progress',
      createdAt: '2026-10-02',
    },
    {
      id: 't-04',
      title: '빠른 마감 긴급 버그 수정',
      done: false,
      startDate: '2026-10-01',
      dueDate: '2026-10-05 23:30',
      priority: 'medium',
      description: '캐시 무효화 실패 방어',
      tags: ['버그'],
      status: 'todo',
      createdAt: '2026-10-01',
    },
  ];

  it('compareTasksDeterministic: 1차 마감일 오름차순, 2차 우선순위, 3차 제목, 4차 ID로 결정적 정렬된다', () => {
    const sorted = [...sampleTasks].sort(compareTasksDeterministic);

    // 1위: 마감일이 2026-10-05인 t-04
    expect(sorted[0].id).toBe('t-04');

    // 2위: 2026-10-09 마감 중 priority high인 t-01
    expect(sorted[1].id).toBe('t-01');

    // 3위: 2026-10-09 마감 중 priority medium인 t-02
    expect(sorted[2].id).toBe('t-02');

    // 4위: 2026-10-09 마감 중 priority low인 t-03
    expect(sorted[3].id).toBe('t-03');
  });

  it('queryTasks: 검색어가 제목 또는 설명에 포함된 항목만 필터링한다', () => {
    const resultByTitle = queryTasks(sampleTasks, { searchQuery: '소켓' });
    expect(resultByTitle.length).toBe(1);
    expect(resultByTitle[0].id).toBe('t-01');

    const resultByDesc = queryTasks(sampleTasks, { searchQuery: 'C4 모델' });
    expect(resultByDesc.length).toBe(1);
    expect(resultByDesc[0].id).toBe('t-03');
  });

  it('queryTasks: 상태, 우선순위, 마감일이 AND 복합 조건으로 정확히 필터링된다', () => {
    const result = queryTasks(sampleTasks, {
      status: 'todo',
      priority: 'low',
    });
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('t-03');

    // 일치하지 않는 복합 조건
    const noResult = queryTasks(sampleTasks, {
      status: 'done',
      priority: 'low',
    });
    expect(noResult.length).toBe(0);
  });
});
