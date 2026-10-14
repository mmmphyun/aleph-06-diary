import { TaskItem, TaskPriority, TaskStatus } from '../types/binder';

export interface TaskFilterOptions {
  status?: TaskStatus | 'all';
  priority?: TaskPriority | 'all';
  dueDate?: string; // YYYY-MM-DD (KST 특정 마감일 필터) 또는 빈 문자열
  searchQuery?: string; // 제목 또는 설명 대상
}

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * 4차 결정적 정렬 키 함수
 * 1차: 마감일 오름차순 (dueDate)
 * 2차: 우선순위 (높음 1 > 보통 2 > 낮음 3)
 * 3차: 제목 가나다순 (title.localeCompare)
 * 4차: id 문자열 오름차순 (id.localeCompare)
 */
export function compareTasksDeterministic(a: TaskItem, b: TaskItem): number {
  // 1차: 마감일 오름차순
  const dueComp = (a.dueDate || '').localeCompare(b.dueDate || '');
  if (dueComp !== 0) return dueComp;

  // 2차: 우선순위 높은 순
  const pA = PRIORITY_ORDER[a.priority] || 99;
  const pB = PRIORITY_ORDER[b.priority] || 99;
  if (pA !== pB) return pA - pB;

  // 3차: 제목 가나다순
  const titleComp = a.title.localeCompare(b.title, 'ko-KR');
  if (titleComp !== 0) return titleComp;

  // 4차: id 문자열 오름차순
  return a.id.localeCompare(b.id);
}

/**
 * 검색 · 필터 · 정렬 결합 파이프라인
 * - 검색: 제목(title) + 설명(description) 대상 (대소문자 무시)
 * - 필터: 상태 / 우선순위 / 마감일 복수 선택 시 AND 조건 결합
 * - 정렬: 4차 결정적 정렬 적용
 */
export function queryTasks(
  tasks: TaskItem[],
  options: TaskFilterOptions
): TaskItem[] {
  const query = options.searchQuery?.trim().toLowerCase() || '';

  const filtered = tasks.filter((task) => {
    // 0. 기본 활성 필터: 휴지통 항목(trashStatus === 1) 제외
    if (task.trashStatus === 1) return false;

    // 1. 검색 (제목 + 설명)
    if (query) {
      const matchTitle = task.title.toLowerCase().includes(query);
      const matchDesc = (task.description || '').toLowerCase().includes(query);
      if (!matchTitle && !matchDesc) return false;
    }

    // 2. 상태 필터 (AND)
    if (options.status && options.status !== 'all') {
      if (task.status !== options.status) return false;
    }

    // 3. 우선순위 필터 (AND)
    if (options.priority && options.priority !== 'all') {
      if (task.priority !== options.priority) return false;
    }

    // 4. 마감일 필터 (AND - YYYY-MM-DD 접두사 매칭)
    if (options.dueDate && options.dueDate.trim() !== '') {
      if (!task.dueDate.startsWith(options.dueDate.trim())) return false;
    }

    return true;
  });

  return [...filtered].sort(compareTasksDeterministic);
}
