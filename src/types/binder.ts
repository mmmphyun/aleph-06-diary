export type SectionTab = 'writing' | 'review' | 'archive';
export type WritingSubSection = 'plan' | 'tasks' | 'logs';

export interface TextRevision {
  id: string;
  startIndex: number;
  endIndex: number;
  originalText: string;
  correctedText: string;
  createdAt: string;
}

export interface PlanPackage {
  id: string;
  title: string;
  content: string; // 계획 본문 텍스트
  revisions: TextRevision[]; // 본문 만년필 인라인 1회 교정 목록
  startPage: number; // 목차 연동 시작 페이지 (예: 1, 5, 9...)
  tasks: TaskItem[]; // 하위 할 일 목록 (1:N)
  logs: LogItem[]; // 하위 실행 일지 목록 (1:N)
  createdAt: string;
}

export interface PlanDocument {
  title: string;
  content: string; // 자동 줄바꿈되는 전체 본문 텍스트
  revisions: TextRevision[]; // 드래그 범위 기반 1회 교정 목록
}

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
