export type SectionTab = 'writing' | 'review' | 'archive';
export type WritingSubSection = 'plan' | 'tasks' | 'logs';

export type TrashStatus = 0 | 1 | 2; // 0: 정상 존재, 1: 휴지통 (삭제 대기), 2: 복구됨

export interface TextRevision {
  id: string;
  startIndex: number;
  endIndex: number;
  originalText: string;
  correctedText: string;
  createdAt: string;
  trashStatus?: TrashStatus;
  trashedAt?: string | null;
}

export interface PlanPackage {
  id: string;
  userId?: string; // Firebase Authentication User UID (T07)
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
  trashStatus?: TrashStatus; // 0=존재, 1=휴지통, 2=복구됨
  trashedAt?: string | null; // 휴지통 진입 시각 (KST ISO 문자열)
  retentionDays?: number; // 보존 기간 (기본 7일)
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
  userId?: string; // Firebase Authentication User UID (T07)
  title: string;
  done: boolean;
  startDate: string; // YYYY-MM-DD (KST)
  dueDate: string; // YYYY-MM-DD HH:mm (KST, 필수)
  priority: TaskPriority; // 'high' | 'medium' | 'low'
  description?: string; // 선택
  tags: string[]; // 태그 목록
  estimatedMinutes?: number; // 예상 소요 시간(분) (T06 스키마 규격)
  status: TaskStatus; // 'todo' | 'in_progress' | 'done'
  completedAt?: string | null; // KST ISO 8601 문자열 또는 null
  createdAt: string;
  trashStatus?: TrashStatus; // 0=존재, 1=휴지통, 2=복구됨
  trashedAt?: string | null; // 휴지통 진입 시각 (KST ISO 문자열)
  retentionDays?: number; // 보존 기간 (기본 7일)
}

export interface TaskInputDto {
  title: string;
  startDate?: string;
  dueDate?: string;
  priority?: TaskPriority;
  description?: string;
  tags?: string[];
  estimatedMinutes?: number;
  status?: TaskStatus;
  completedAt?: string | null;
  trashStatus?: TrashStatus;
  trashedAt?: string | null;
}

export interface LogItem {
  id: string;
  userId?: string; // Firebase Authentication User UID (T07)
  taskId: string;
  taskTitle: string;
  completedAt: string;
  startedAt?: string; // 시작 일시 (KST ISO 8601)
  endedAt?: string; // 종료 일시 (KST ISO 8601)
  actualMinutes?: number; // 런타임 계산된 소요 시간(분)
  impediment?: string; // 막혔던 이유 / 장애 요인
  comment: string; // 성찰 및 한 줄 소회
  trashStatus?: TrashStatus; // 0=존재, 1=휴지통, 2=복구됨
  trashedAt?: string | null; // 휴지통 진입 시각 (KST ISO 문자열)
  retentionDays?: number; // 보존 기간 (기본 7일)
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
  trashStatus?: TrashStatus;
  trashedAt?: string | null;
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
  updateLog(pkgId: string, logId: string, updates: { comment?: string; impediment?: string }): PlanPackage;
  toggleTaskDone(pkgId: string, taskId: string, comment?: string, impediment?: string): { packages: PlanPackage[]; updatedPkg: PlanPackage };
  // M6: 휴지통 및 영구 삭제 라이프사이클 메서드
  trashPlan(pkgId: string): PlanPackage[];
  restorePlan(pkgId: string, targetStatus?: 0 | 2): PlanPackage[];
  purgePlan(pkgId: string): PlanPackage[];
  trashTask(pkgId: string, taskId: string): PlanPackage;
  restoreTask(pkgId: string, taskId: string, targetStatus?: 0 | 2): PlanPackage;
  purgeTask(pkgId: string, taskId: string): PlanPackage;
  trashLog(pkgId: string, logId: string): PlanPackage;
  restoreLog(pkgId: string, logId: string, targetStatus?: 0 | 2): PlanPackage;
  purgeLog(pkgId: string, logId: string): PlanPackage;
  purgeExpiredTrash(): { purgedPlans: string[]; purgedTasks: string[]; purgedLogs: string[] };
  // M2 / T07-C134: 회원 탈퇴 시 사용자 소유 전체 데이터 일괄 영구 파기
  purgeAllUserData(): Promise<void>;
}
