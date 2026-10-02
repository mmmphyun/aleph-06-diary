export type SectionTab = 'writing' | 'review' | 'archive';
export type WritingSubSection = 'plan' | 'tasks' | 'logs';

export interface PlanLine {
  id: string;
  originalText: string;
  correctedText?: string; // 1회 교정 텍스트 (바로 아래 18px 여백선)
  isStrikethrough: boolean;
}

export interface TaskItem {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
}

export interface LogItem {
  id: string;
  taskId: string;
  taskTitle: string;
  completedAt: string;
  comment: string;
}
