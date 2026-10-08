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
  tasksTemplateApplied?: boolean; // 빈 속지에서 할 일 템플릿 적용 여부
  planStatus?: 'draft' | 'confirmed'; // 계획 작성 중 vs 확정(날인) 완료
  period?: {
    start: string; // YYYY-MM-DD
    end: string; // YYYY-MM-DD
  };
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

export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'todo' | 'in_progress' | 'done';

export interface TaskItem {
  id: string;
  title: string;
  done: boolean;
  startDate: string; // YYYY-MM-DD (KST)
  dueDate: string; // YYYY-MM-DD HH:mm (KST, 필수)
  priority: TaskPriority; // 'high' | 'medium' | 'low'
  description?: string; // 선택
  tags: string[]; // 태그 목록
  status: TaskStatus; // 'todo' | 'in_progress' | 'done'
  createdAt: string;
}

export interface TaskInputDto {
  title: string;
  startDate?: string;
  dueDate?: string;
  priority?: TaskPriority;
  description?: string;
  tags?: string[];
  status?: TaskStatus;
}

export interface LogItem {
  id: string;
  taskId: string;
  taskTitle: string;
  completedAt: string;
  comment: string;
}

/**
 * 백엔드 API / DB 연동 대비 DTO 규격 정의
 */
export interface CreatePlanPackageDto {
  title: string;
  startDate?: string;
  endDate?: string;
}

export interface UpdatePlanPackageDto {
  title?: string;
  content?: string;
  planStatus?: 'draft' | 'confirmed';
  tasksTemplateApplied?: boolean;
}

export interface IPlanPackageRepository {
  loadPackages(): PlanPackage[];
  savePackages(packages: PlanPackage[]): void;
  getPlansByDate(dateStr: string): PlanPackage[];
  createPackage(title: string, startDate?: string, endDate?: string): PlanPackage;
  updatePackage(pkg: PlanPackage): void;
  confirmPlan(pkgId: string): PlanPackage;
  applyTasksTemplate(pkgId: string): PlanPackage;
  updatePlanText(pkgId: string, title: string, content: string): PlanPackage;
  addRevision(pkgId: string, revision: TextRevision): PlanPackage;
  addTask(pkgId: string, input: string | TaskInputDto): PlanPackage;
  updateTask(pkgId: string, taskId: string, updates: Partial<TaskInputDto>): PlanPackage;
  deleteTask(pkgId: string, taskId: string): PlanPackage;
  updateLogComment(pkgId: string, logId: string, comment: string): PlanPackage;
  toggleTaskDone(pkgId: string, taskId: string, comment?: string): { packages: PlanPackage[]; updatedPkg: PlanPackage };
}
