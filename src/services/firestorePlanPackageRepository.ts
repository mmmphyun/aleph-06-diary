import {
  collection,
  doc,
  writeBatch,
  getDocs,
  onSnapshot,
  runTransaction,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type {
  PlanPackage,
  TaskItem,
  TaskInputDto,
  LogItem,
  TextRevision,
  IPlanPackageRepository,
} from '../types/binder';
import { INITIAL_PLAN_PACKAGES } from './planPackageService';
import {
  getTodayKST,
  getDefaultDueDateKST,
  getNowKSTIsoString,
  calculateActualMinutes,
} from '../utils/dateUtils';

const STORAGE_CACHE_KEY = 'aleph06_plan_packages';

class FirestorePlanPackageRepository implements IPlanPackageRepository {
  private cache: PlanPackage[] = [];
  private isInitialized = false;

  constructor() {
    this.initCacheFromLocal();
    this.initFirestoreSync();
  }

  private initCacheFromLocal(): void {
    try {
      const data = localStorage.getItem(STORAGE_CACHE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.cache = parsed;
          return;
        }
      }
    } catch {
      // 로컬 스토리지 파싱 오류 방어
    }
    this.cache = [...INITIAL_PLAN_PACKAGES];
  }

  private saveToLocal(): void {
    try {
      localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(this.cache));
    } catch {
      // 로컬 스토리지 쓰기 오류 무시
    }
  }

  private async initFirestoreSync(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;

    try {
      const plansSnapshot = await getDocs(collection(db, 'plans'));
      if (plansSnapshot.empty) {
        // Firestore가 비어있으면 초기 패키지들을 plans, tasks, executionLogs로 분해하여 원자적 시딩
        await this.seedPackages(this.cache);
      } else {
        await this.refreshFromFirestore();
      }

      // Firestore 변경사항 실시간 감지 및 인메모리/로컬 동기화
      this.listenToCollections();
    } catch (error) {
      console.warn('[FirestorePlanPackageRepository] Firestore 초기화/동기화 대기 (오프라인 캐시 유지):', error);
    }
  }

  private async seedPackages(packages: PlanPackage[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      for (const pkg of packages) {
        // 1. plans 컬렉션 문서
        const planRef = doc(db, 'plans', pkg.id);
        batch.set(planRef, {
          id: pkg.id,
          title: pkg.title,
          content: pkg.content,
          revisions: pkg.revisions || [],
          startPage: pkg.startPage,
          tasksTemplateApplied: !!pkg.tasksTemplateApplied,
          planStatus: pkg.planStatus || 'draft',
          period: pkg.period || null,
          createdAt: pkg.createdAt,
          updatedAt: new Date().toISOString(),
          trashStatus: pkg.trashStatus ?? 0,
          trashedAt: pkg.trashedAt ?? null,
          retentionDays: pkg.retentionDays ?? 7,
        });

        // 2. tasks 컬렉션 문서 분해
        for (const task of pkg.tasks) {
          const taskRef = doc(db, 'tasks', task.id);
          batch.set(taskRef, {
            id: task.id,
            planId: pkg.id,
            title: task.title,
            done: task.done,
            startDate: task.startDate,
            dueDate: task.dueDate,
            priority: task.priority,
            description: task.description || '',
            tags: task.tags || [],
            estimatedMinutes: task.estimatedMinutes ?? 60,
            status: task.status,
            completedAt: task.completedAt || null,
            createdAt: task.createdAt,
            trashStatus: task.trashStatus ?? 0,
            trashedAt: task.trashedAt ?? null,
            retentionDays: task.retentionDays ?? 7,
          });
        }

        // 3. executionLogs 컬렉션 문서 분해
        for (const log of pkg.logs) {
          const logRef = doc(db, 'executionLogs', log.id);
          batch.set(logRef, {
            id: log.id,
            planId: pkg.id,
            taskId: log.taskId,
            taskTitle: log.taskTitle,
            completedAt: log.completedAt,
            startedAt: log.startedAt || null,
            endedAt: log.endedAt || null,
            impediment: log.impediment || '',
            comment: log.comment,
            trashStatus: log.trashStatus ?? 0,
            trashedAt: log.trashedAt ?? null,
            retentionDays: log.retentionDays ?? 7,
          });
        }
      }
      await batch.commit();
    } catch (error) {
      console.error('[FirestorePlanPackageRepository] 시드 데이터 저장 오류:', error);
    }
  }

  private async refreshFromFirestore(): Promise<void> {
    try {
      const [plansSnap, tasksSnap, logsSnap] = await Promise.all([
        getDocs(collection(db, 'plans')),
        getDocs(collection(db, 'tasks')),
        getDocs(collection(db, 'executionLogs')),
      ]);

      if (plansSnap.empty) return;

      const planDocs = plansSnap.docs.map((d) => d.data());
      const taskDocs = tasksSnap.docs.map((d) => d.data());
      const logDocs = logsSnap.docs.map((d) => d.data());

      this.cache = this.combineCollections(planDocs, taskDocs, logDocs);
      this.saveToLocal();
    } catch (error) {
      console.error('[FirestorePlanPackageRepository] Firestore 데이터 복원 오류:', error);
    }
  }

  private listenToCollections(): void {
    // plans 컬렉션 변경 리스너
    onSnapshot(collection(db, 'plans'), () => {
      this.refreshFromFirestore().catch(() => {});
    });
  }

  private combineCollections(
    planDocs: any[],
    taskDocs: any[],
    logDocs: any[]
  ): PlanPackage[] {
    return planDocs
      .map((p) => {
        const planTasks: TaskItem[] = taskDocs
          .filter((t) => t.planId === p.id)
          .map((t) => {
            const today = getTodayKST();
            const defaultDue = getDefaultDueDateKST(today);
            const isDone = !!t.done || t.status === 'done';
            return {
              id: t.id,
              title: t.title || '',
              done: isDone,
              startDate: t.startDate || today,
              dueDate: t.dueDate || defaultDue,
              priority: (t.priority as any) || 'medium',
              description: t.description || '',
              tags: Array.isArray(t.tags) ? t.tags : [],
              estimatedMinutes: typeof t.estimatedMinutes === 'number' ? t.estimatedMinutes : 60,
              status: (t.status as any) || (isDone ? 'done' : 'todo'),
              completedAt: t.completedAt || (isDone ? t.updatedAt || today : null),
              createdAt: t.createdAt || today,
              trashStatus: (typeof t.trashStatus === 'number' ? t.trashStatus : 0) as 0 | 1 | 2,
              trashedAt: t.trashedAt || null,
              retentionDays: t.retentionDays ?? 7,
            };
          });

        const planLogs: LogItem[] = logDocs
          .filter((l) => l.planId === p.id)
          .map((l) => {
            const startedAt = l.startedAt || undefined;
            const endedAt = l.endedAt || undefined;
            const actualMinutes = calculateActualMinutes(startedAt, endedAt);
            return {
              id: l.id,
              taskId: l.taskId,
              taskTitle: l.taskTitle,
              completedAt: l.completedAt,
              startedAt,
              endedAt,
              actualMinutes,
              impediment: l.impediment || '',
              comment: l.comment || '',
              trashStatus: (typeof l.trashStatus === 'number' ? l.trashStatus : 0) as 0 | 1 | 2,
              trashedAt: l.trashedAt || null,
              retentionDays: l.retentionDays ?? 7,
            };
          });

        return {
          id: p.id,
          title: p.title || '',
          content: p.content || '',
          revisions: (p.revisions || []).map((r: any) => ({
            ...r,
            trashStatus: typeof r.trashStatus === 'number' ? r.trashStatus : 0,
            trashedAt: r.trashedAt || null,
          })),
          startPage: p.startPage || 1,
          tasks: planTasks,
          logs: planLogs,
          tasksTemplateApplied: p.tasksTemplateApplied,
          planStatus: p.planStatus,
          period: p.period || undefined,
          createdAt: p.createdAt || new Date().toISOString().split('T')[0],
          trashStatus: (typeof p.trashStatus === 'number' ? p.trashStatus : 0) as 0 | 1 | 2,
          trashedAt: p.trashedAt || null,
          retentionDays: p.retentionDays ?? 7,
        };
      })
      .sort((a, b) => a.startPage - b.startPage);
  }

  private async syncPackageToFirestore(pkg: PlanPackage, deletedTaskIds: string[] = []): Promise<void> {
    try {
      const batch = writeBatch(db);

      // 1. plans 컬렉션 원자적 업데이트
      const planRef = doc(db, 'plans', pkg.id);
      batch.set(planRef, {
        id: pkg.id,
        title: pkg.title,
        content: pkg.content,
        revisions: pkg.revisions || [],
        startPage: pkg.startPage,
        tasksTemplateApplied: !!pkg.tasksTemplateApplied,
        planStatus: pkg.planStatus || 'draft',
        period: pkg.period || null,
        createdAt: pkg.createdAt,
        updatedAt: new Date().toISOString(),
        trashStatus: pkg.trashStatus ?? 0,
        trashedAt: pkg.trashedAt ?? null,
        retentionDays: pkg.retentionDays ?? 7,
      });

      // 2. tasks 컬렉션 원자적 저장
      for (const task of pkg.tasks) {
        const taskRef = doc(db, 'tasks', task.id);
        batch.set(taskRef, {
          id: task.id,
          planId: pkg.id,
          title: task.title,
          done: task.done,
          startDate: task.startDate,
          dueDate: task.dueDate,
          priority: task.priority,
          description: task.description || '',
          tags: task.tags || [],
          estimatedMinutes: task.estimatedMinutes ?? 60,
          status: task.status,
          completedAt: task.completedAt || null,
          createdAt: task.createdAt,
          trashStatus: task.trashStatus ?? 0,
          trashedAt: task.trashedAt ?? null,
          retentionDays: task.retentionDays ?? 7,
        });
      }

      // 삭제된 태스크 제거
      for (const delId of deletedTaskIds) {
        batch.delete(doc(db, 'tasks', delId));
      }

      // 3. executionLogs 컬렉션 원자적 저장
      for (const log of pkg.logs) {
        const logRef = doc(db, 'executionLogs', log.id);
        batch.set(logRef, {
          id: log.id,
          planId: pkg.id,
          taskId: log.taskId,
          taskTitle: log.taskTitle,
          completedAt: log.completedAt,
          startedAt: log.startedAt || null,
          endedAt: log.endedAt || null,
          impediment: log.impediment || '',
          comment: log.comment,
          trashStatus: log.trashStatus ?? 0,
          trashedAt: log.trashedAt ?? null,
          retentionDays: log.retentionDays ?? 7,
        });
      }

      await batch.commit();
    } catch (error) {
      console.error(`[FirestorePlanPackageRepository] 원자적 배치 저장 실패 (${pkg.id}):`, error);
    }
  }

  loadPackages(): PlanPackage[] {
    return this.cache;
  }

  savePackages(packages: PlanPackage[]): void {
    this.cache = packages;
    this.saveToLocal();
    // 전체 패키지 동기화
    for (const pkg of packages) {
      this.syncPackageToFirestore(pkg);
    }
  }

  getPlansByDate(dateStr: string): PlanPackage[] {
    return this.cache.filter((pkg) => {
      if (pkg.period) {
        return pkg.period.start <= dateStr && dateStr <= pkg.period.end;
      }
      return pkg.createdAt.startsWith(dateStr);
    });
  }

  createPackage(title: string, startDate?: string, endDate?: string): PlanPackage {
    const lastPage = this.cache.length > 0 ? this.cache[this.cache.length - 1].startPage + 4 : 1;
    const today = new Date().toISOString().split('T')[0];
    const newPkg: PlanPackage = {
      id: `plan-${Date.now()}`,
      title: title.trim() || `새로운 계획 ${this.cache.length + 1}`,
      content: '',
      revisions: [],
      startPage: lastPage,
      tasks: [],
      logs: [],
      tasksTemplateApplied: false,
      planStatus: 'draft',
      period: {
        start: startDate || today,
        end: endDate || startDate || today,
      },
      createdAt: today,
    };

    this.cache = [...this.cache, newPkg];
    this.saveToLocal();
    this.syncPackageToFirestore(newPkg);
    return newPkg;
  }

  updatePackage(pkg: PlanPackage): void {
    this.cache = this.cache.map((p) => (p.id === pkg.id ? pkg : p));
    this.saveToLocal();
    this.syncPackageToFirestore(pkg);
  }

  confirmPlan(pkgId: string): PlanPackage {
    const target = this.cache.find((p) => p.id === pkgId);
    if (!target) return this.cache[0];
    const newPkg: PlanPackage = { ...target, planStatus: 'confirmed' };
    this.cache = this.cache.map((p) => (p.id === pkgId ? newPkg : p));
    this.saveToLocal();
    this.syncPackageToFirestore(newPkg);
    return newPkg;
  }

  applyTasksTemplate(pkgId: string): PlanPackage {
    const target = this.cache.find((p) => p.id === pkgId);
    if (!target) return this.cache[0];
    const newPkg: PlanPackage = { ...target, tasksTemplateApplied: true };
    this.cache = this.cache.map((p) => (p.id === pkgId ? newPkg : p));
    this.saveToLocal();
    this.syncPackageToFirestore(newPkg);
    return newPkg;
  }

  updatePlanText(pkgId: string, title: string, content: string): PlanPackage {
    const target = this.cache.find((p) => p.id === pkgId);
    if (!target) return this.cache[0];
    const newPkg: PlanPackage = { ...target, title, content };
    this.cache = this.cache.map((p) => (p.id === pkgId ? newPkg : p));
    this.saveToLocal();
    this.syncPackageToFirestore(newPkg);
    return newPkg;
  }

  addRevision(pkgId: string, revision: TextRevision): PlanPackage {
    const target = this.cache.find((p) => p.id === pkgId);
    if (!target) return this.cache[0];
    const newPkg: PlanPackage = { ...target, revisions: [...target.revisions, revision] };
    this.cache = this.cache.map((p) => (p.id === pkgId ? newPkg : p));
    this.saveToLocal();
    this.syncPackageToFirestore(newPkg);
    return newPkg;
  }

  addTask(pkgId: string, input: string | TaskInputDto): PlanPackage {
    const target = this.cache.find((p) => p.id === pkgId);
    if (!target) return this.cache[0];

    const today = getTodayKST();

    const title = typeof input === 'string' ? input.trim() : input.title.trim();
    const startDate = (typeof input === 'object' && input.startDate) || today;
    const dueDate = (typeof input === 'object' && input.dueDate) || getDefaultDueDateKST(startDate);
    const priority = (typeof input === 'object' && input.priority) || 'medium';
    const description = (typeof input === 'object' && input.description) || '';
    const tags = (typeof input === 'object' && input.tags) || [];
    const estimatedMinutes = (typeof input === 'object' && typeof input.estimatedMinutes === 'number') ? input.estimatedMinutes : 60;
    const status = (typeof input === 'object' && input.status) || 'todo';

    const newTask: TaskItem = {
      id: `t-${Date.now()}`,
      title: title || '새로운 할 일',
      done: status === 'done',
      startDate,
      dueDate,
      priority,
      description,
      tags,
      estimatedMinutes,
      status,
      createdAt: today,
    };
    const newPkg: PlanPackage = { ...target, tasks: [...target.tasks, newTask] };
    this.cache = this.cache.map((p) => (p.id === pkgId ? newPkg : p));
    this.saveToLocal();
    this.syncPackageToFirestore(newPkg);
    return newPkg;
  }

  updateTask(pkgId: string, taskId: string, updates: Partial<TaskInputDto>): PlanPackage {
    const target = this.cache.find((p) => p.id === pkgId);
    if (!target) return this.cache[0];

    const updatedTasks = target.tasks.map((t) => {
      if (t.id !== taskId) return t;
      const nextTitle = updates.title !== undefined ? updates.title.trim() : t.title;
      const nextStartDate = updates.startDate !== undefined ? updates.startDate : t.startDate;
      const nextDueDate = updates.dueDate !== undefined ? updates.dueDate : t.dueDate;
      const nextPriority = updates.priority !== undefined ? updates.priority : t.priority;
      const nextDescription = updates.description !== undefined ? updates.description : t.description;
      const nextTags = updates.tags !== undefined ? updates.tags : t.tags;
      const nextEstimated = updates.estimatedMinutes !== undefined ? updates.estimatedMinutes : t.estimatedMinutes;
      const nextStatus = updates.status !== undefined ? updates.status : t.status;
      const nextDone = nextStatus === 'done' || (updates.status === undefined && t.done);
      let nextCompletedAt = t.completedAt;
      if (updates.status !== undefined) {
        if (updates.status === 'done') {
          nextCompletedAt = updates.completedAt || t.completedAt || getNowKSTIsoString();
        } else {
          nextCompletedAt = null;
        }
      }

      return {
        ...t,
        title: nextTitle,
        startDate: nextStartDate,
        dueDate: nextDueDate,
        priority: nextPriority,
        description: nextDescription,
        tags: nextTags,
        estimatedMinutes: nextEstimated,
        status: nextStatus,
        done: nextDone,
        completedAt: nextCompletedAt,
      };
    });

    const newPkg: PlanPackage = { ...target, tasks: updatedTasks };
    this.cache = this.cache.map((p) => (p.id === pkgId ? newPkg : p));
    this.saveToLocal();
    this.syncPackageToFirestore(newPkg);
    return newPkg;
  }

  deleteTask(pkgId: string, taskId: string): PlanPackage {
    // T06-C13/C36: 단순 삭제는 휴지통 플래그(trashStatus = 1)로 연쇄 이동
    return this.trashTask(pkgId, taskId);
  }

  /**
   * M6: 계획 연쇄 휴지통 이동 (Cascade Trash)
   * - 해당 계획 및 연결된 할 일 전체, 실행 기록 전체, 리비전 스냅샷을 원자적으로 trashStatus = 1 처리
   */
  trashPlan(pkgId: string): PlanPackage[] {
    const nowKst = getNowKSTIsoString();
    const target = this.cache.find((p) => p.id === pkgId);
    if (!target) return this.cache;

    const updatedPkg: PlanPackage = {
      ...target,
      trashStatus: 1,
      trashedAt: nowKst,
      revisions: target.revisions.map((r) => ({ ...r, trashStatus: 1, trashedAt: nowKst })),
      tasks: target.tasks.map((t) => ({ ...t, trashStatus: 1, trashedAt: nowKst })),
      logs: target.logs.map((l) => ({ ...l, trashStatus: 1, trashedAt: nowKst })),
    };

    this.cache = this.cache.map((p) => (p.id === pkgId ? updatedPkg : p));
    this.saveToLocal();
    this.syncPackageToFirestore(updatedPkg);
    return this.cache;
  }

  /**
   * M6: 계획 연쇄 복구 (Cascade Restore)
   * - 연결 단위 전체를 원자적으로 trashStatus = 2 (또는 사용자 지정 상태) 복구하고 trashedAt = null 초기화
   */
  restorePlan(pkgId: string, targetStatus: 0 | 2 = 2): PlanPackage[] {
    const target = this.cache.find((p) => p.id === pkgId);
    if (!target) return this.cache;

    const updatedPkg: PlanPackage = {
      ...target,
      trashStatus: targetStatus,
      trashedAt: null,
      revisions: target.revisions.map((r) => ({ ...r, trashStatus: targetStatus, trashedAt: null })),
      tasks: target.tasks.map((t) => ({ ...t, trashStatus: targetStatus, trashedAt: null })),
      logs: target.logs.map((l) => ({ ...l, trashStatus: targetStatus, trashedAt: null })),
    };

    this.cache = this.cache.map((p) => (p.id === pkgId ? updatedPkg : p));
    this.saveToLocal();
    this.syncPackageToFirestore(updatedPkg);
    return this.cache;
  }

  /**
   * M6: 계획 물리 영구 삭제 (Permanent Purge)
   * - Firestore 및 로컬 캐시에서 해당 계획 및 하위 할 일/실행 기록 문서 완전 삭제
   */
  purgePlan(pkgId: string): PlanPackage[] {
    const target = this.cache.find((p) => p.id === pkgId);
    if (!target) return this.cache;

    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'plans', pkgId));
      for (const t of target.tasks) {
        batch.delete(doc(db, 'tasks', t.id));
      }
      for (const l of target.logs) {
        batch.delete(doc(db, 'executionLogs', l.id));
      }
      batch.commit().catch((err) => {
        console.warn(`[FirestorePlanPackageRepository] Firestore 계획 영구 삭제 배치 실패 (${pkgId}):`, err);
      });
    } catch (err) {
      console.warn(`[FirestorePlanPackageRepository] 영구 삭제 오류:`, err);
    }

    this.cache = this.cache.filter((p) => p.id !== pkgId);
    this.saveToLocal();
    return this.cache;
  }

  /**
   * M6: 할 일 연쇄 휴지통 이동
   * - 해당 할 일 및 연결된 실행 기록들을 함께 trashStatus = 1 처리
   */
  trashTask(pkgId: string, taskId: string): PlanPackage {
    const target = this.cache.find((p) => p.id === pkgId);
    if (!target) return this.cache[0];
    const nowKst = getNowKSTIsoString();

    const updatedTasks = target.tasks.map((t) =>
      t.id === taskId ? { ...t, trashStatus: 1 as const, trashedAt: nowKst } : t
    );
    const updatedLogs = target.logs.map((l) =>
      l.taskId === taskId ? { ...l, trashStatus: 1 as const, trashedAt: nowKst } : l
    );

    const newPkg: PlanPackage = {
      ...target,
      tasks: updatedTasks,
      logs: updatedLogs,
    };

    this.cache = this.cache.map((p) => (p.id === pkgId ? newPkg : p));
    this.saveToLocal();
    this.syncPackageToFirestore(newPkg);
    return newPkg;
  }

  /**
   * M6: 할 일 및 연결 실행 기록 복구
   * - 부모 계획이 휴지통이면 부모 계획도 함께 복구
   */
  restoreTask(pkgId: string, taskId: string, targetStatus: 0 | 2 = 2): PlanPackage {
    const target = this.cache.find((p) => p.id === pkgId);
    if (!target) return this.cache[0];

    const updatedTasks = target.tasks.map((t) =>
      t.id === taskId ? { ...t, trashStatus: targetStatus, trashedAt: null } : t
    );
    const updatedLogs = target.logs.map((l) =>
      l.taskId === taskId ? { ...l, trashStatus: targetStatus, trashedAt: null } : l
    );

    // 부모 계획이 휴지통인 경우 부모 계획도 함께 복구하여 고아 상태 방지
    const shouldRestorePlan = target.trashStatus === 1;

    const newPkg: PlanPackage = {
      ...target,
      trashStatus: shouldRestorePlan ? targetStatus : target.trashStatus,
      trashedAt: shouldRestorePlan ? null : target.trashedAt,
      tasks: updatedTasks,
      logs: updatedLogs,
    };

    this.cache = this.cache.map((p) => (p.id === pkgId ? newPkg : p));
    this.saveToLocal();
    this.syncPackageToFirestore(newPkg);
    return newPkg;
  }

  /**
   * M6: 할 일 및 연결 실행 기록 영구 삭제
   */
  purgeTask(pkgId: string, taskId: string): PlanPackage {
    const target = this.cache.find((p) => p.id === pkgId);
    if (!target) return this.cache[0];

    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'tasks', taskId));
      const relatedLogs = target.logs.filter((l) => l.taskId === taskId);
      for (const l of relatedLogs) {
        batch.delete(doc(db, 'executionLogs', l.id));
      }
      batch.commit().catch((err) => {
        console.warn(`[FirestorePlanPackageRepository] 태스크 영구 삭제 배치 실패:`, err);
      });
    } catch (err) {
      console.warn(`[FirestorePlanPackageRepository] 영구 삭제 오류:`, err);
    }

    const newPkg: PlanPackage = {
      ...target,
      tasks: target.tasks.filter((t) => t.id !== taskId),
      logs: target.logs.filter((l) => l.taskId !== taskId),
    };

    this.cache = this.cache.map((p) => (p.id === pkgId ? newPkg : p));
    this.saveToLocal();
    return newPkg;
  }

  /**
   * M6: 실행 기록 단독 휴지통 이동
   */
  trashLog(pkgId: string, logId: string): PlanPackage {
    const target = this.cache.find((p) => p.id === pkgId);
    if (!target) return this.cache[0];
    const nowKst = getNowKSTIsoString();

    const newPkg: PlanPackage = {
      ...target,
      logs: target.logs.map((l) =>
        l.id === logId ? { ...l, trashStatus: 1 as const, trashedAt: nowKst } : l
      ),
    };

    this.cache = this.cache.map((p) => (p.id === pkgId ? newPkg : p));
    this.saveToLocal();
    this.syncPackageToFirestore(newPkg);
    return newPkg;
  }

  /**
   * M6: 실행 기록 복구 (부모 태스크나 계획이 휴지통인 경우 상위도 함께 복구)
   */
  restoreLog(pkgId: string, logId: string, targetStatus: 0 | 2 = 2): PlanPackage {
    const target = this.cache.find((p) => p.id === pkgId);
    if (!target) return this.cache[0];

    const targetLog = target.logs.find((l) => l.id === logId);
    const relatedTaskId = targetLog?.taskId;

    const updatedTasks = target.tasks.map((t) =>
      t.id === relatedTaskId && t.trashStatus === 1
        ? { ...t, trashStatus: targetStatus, trashedAt: null }
        : t
    );

    const updatedLogs = target.logs.map((l) =>
      l.id === logId ? { ...l, trashStatus: targetStatus, trashedAt: null } : l
    );

    const shouldRestorePlan = target.trashStatus === 1;

    const newPkg: PlanPackage = {
      ...target,
      trashStatus: shouldRestorePlan ? targetStatus : target.trashStatus,
      trashedAt: shouldRestorePlan ? null : target.trashedAt,
      tasks: updatedTasks,
      logs: updatedLogs,
    };

    this.cache = this.cache.map((p) => (p.id === pkgId ? newPkg : p));
    this.saveToLocal();
    this.syncPackageToFirestore(newPkg);
    return newPkg;
  }

  /**
   * M6: 실행 기록 영구 삭제
   */
  purgeLog(pkgId: string, logId: string): PlanPackage {
    const target = this.cache.find((p) => p.id === pkgId);
    if (!target) return this.cache[0];

    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'executionLogs', logId));
      batch.commit().catch((err) => {
        console.warn(`[FirestorePlanPackageRepository] 실행 일지 영구 삭제 실패:`, err);
      });
    } catch (err) {
      console.warn(`[FirestorePlanPackageRepository] 영구 삭제 오류:`, err);
    }

    const newPkg: PlanPackage = {
      ...target,
      logs: target.logs.filter((l) => l.id !== logId),
    };

    this.cache = this.cache.map((p) => (p.id === pkgId ? newPkg : p));
    this.saveToLocal();
    return newPkg;
  }

  /**
   * M6: 7일 만료된 휴지통 항목 일괄 영구 삭제
   */
  purgeExpiredTrash(): { purgedPlans: string[]; purgedTasks: string[]; purgedLogs: string[] } {
    const now = Date.now();
    const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

    const isExpired = (trashedAt?: string | null): boolean => {
      if (!trashedAt) return false;
      const t = new Date(trashedAt).getTime();
      return !isNaN(t) && now - t >= RETENTION_MS;
    };

    const purgedPlans: string[] = [];
    const purgedTasks: string[] = [];
    const purgedLogs: string[] = [];

    const batch = writeBatch(db);
    let batchHasOperations = false;

    // 1. 만료된 계획 식별
    const remainingPackages: PlanPackage[] = [];

    for (const pkg of this.cache) {
      if (pkg.trashStatus === 1 && isExpired(pkg.trashedAt)) {
        purgedPlans.push(pkg.id);
        batch.delete(doc(db, 'plans', pkg.id));
        batchHasOperations = true;
        for (const t of pkg.tasks) {
          batch.delete(doc(db, 'tasks', t.id));
          purgedTasks.push(t.id);
        }
        for (const l of pkg.logs) {
          batch.delete(doc(db, 'executionLogs', l.id));
          purgedLogs.push(l.id);
        }
      } else {
        // 계획 내부 만료된 태스크 및 로그 필터링
        const filteredTasks = pkg.tasks.filter((t) => {
          if (t.trashStatus === 1 && isExpired(t.trashedAt)) {
            purgedTasks.push(t.id);
            batch.delete(doc(db, 'tasks', t.id));
            batchHasOperations = true;
            return false;
          }
          return true;
        });

        const filteredLogs = pkg.logs.filter((l) => {
          if (l.trashStatus === 1 && isExpired(l.trashedAt)) {
            purgedLogs.push(l.id);
            batch.delete(doc(db, 'executionLogs', l.id));
            batchHasOperations = true;
            return false;
          }
          return true;
        });

        remainingPackages.push({
          ...pkg,
          tasks: filteredTasks,
          logs: filteredLogs,
        });
      }
    }

    if (batchHasOperations) {
      batch.commit().catch((err) => {
        console.warn('[FirestorePlanPackageRepository] 만료 데이터 배치 삭제 실패:', err);
      });
    }

    this.cache = remainingPackages;
    this.saveToLocal();

    return { purgedPlans, purgedTasks, purgedLogs };
  }

  updateLogComment(pkgId: string, logId: string, comment: string): PlanPackage {
    return this.updateLog(pkgId, logId, { comment });
  }

  updateLog(
    pkgId: string,
    logId: string,
    updates: { comment?: string; impediment?: string }
  ): PlanPackage {
    const target = this.cache.find((p) => p.id === pkgId);
    if (!target) return this.cache[0];
    const newPkg: PlanPackage = {
      ...target,
      logs: target.logs.map((l) => {
        if (l.id !== logId) return l;
        return {
          ...l,
          comment: updates.comment !== undefined ? updates.comment : l.comment,
          impediment: updates.impediment !== undefined ? updates.impediment : l.impediment,
        };
      }),
    };
    this.cache = this.cache.map((p) => (p.id === pkgId ? newPkg : p));
    this.saveToLocal();
    this.syncPackageToFirestore(newPkg);
    return newPkg;
  }

  toggleTaskDone(
    pkgId: string,
    taskId: string,
    comment?: string,
    impediment?: string
  ): { packages: PlanPackage[]; updatedPkg: PlanPackage } {
    let targetPkg = this.cache.find((p) => p.id === pkgId);
    if (!targetPkg) return { packages: this.cache, updatedPkg: this.cache[0] };

    const targetTask = targetPkg.tasks.find((t) => t.id === taskId);
    if (!targetTask) return { packages: this.cache, updatedPkg: targetPkg };

    const nextDone = !targetTask.done;
    const nowKst = getNowKSTIsoString();

    let updatedLogs = [...targetPkg.logs];
    let createdLog: LogItem | null = null;

    if (nextDone) {
      // 완료 시: 1시간 전 시작 기준의 기본 타임스탬프 산출 (시작일시~종료일시 환산 소요시간 제공)
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 60 * 60 * 1000);
      const startKst = new Date(startDate.getTime() + 9 * 60 * 60 * 1000)
        .toISOString()
        .substring(0, 19) + '+09:00';

      const actualMinutes = calculateActualMinutes(startKst, nowKst);

      createdLog = {
        id: `log-${Date.now()}`,
        taskId: targetTask.id,
        taskTitle: targetTask.title,
        completedAt: nowKst,
        startedAt: startKst,
        endedAt: nowKst,
        actualMinutes,
        impediment: impediment || '',
        comment: comment || '할 일을 완수하고 실행 성찰을 남깁니다.',
      };
      updatedLogs.push(createdLog);
    } else {
      // 진행 중으로 복귀 시: 해당 할 일의 실행 기록 해제
      updatedLogs = updatedLogs.filter((l) => l.taskId !== taskId);
    }

    const updatedTasks = targetPkg.tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            done: nextDone,
            status: nextDone ? ('done' as const) : ('in_progress' as const),
            completedAt: nextDone ? nowKst : null,
          }
        : t
    );

    const newPkg: PlanPackage = {
      ...targetPkg,
      tasks: updatedTasks,
      logs: updatedLogs,
    };

    this.cache = this.cache.map((p) => (p.id === pkgId ? newPkg : p));
    this.saveToLocal();

    // Firestore 트랜잭션 기반 원자적 멱등 완료 처리 (옵션 A 확정 규격)
    this.executeAtomicTaskStatusTransition(
      pkgId,
      taskId,
      nextDone,
      nowKst,
      createdLog
    ).catch((err) => {
      console.warn('[FirestorePlanPackageRepository] 원자적 트랜잭션 동기화 보류, 배치 동기화 대체:', err);
      this.syncPackageToFirestore(newPkg);
    });

    return { packages: this.cache, updatedPkg: newPkg };
  }

  /**
   * Firestore runTransaction을 통한 할 일 상태 전환의 원자적 멱등성 보장
   * - 중복 완료 요청 시 status === 'done'을 확인하여 불필요한 중복 상태 갱신 및 집계 왜곡 차단
   */
  private async executeAtomicTaskStatusTransition(
    planId: string,
    taskId: string,
    targetDone: boolean,
    nowKst: string,
    newLog: LogItem | null
  ): Promise<void> {
    const taskRef = doc(db, 'tasks', taskId);

    await runTransaction(db, async (transaction) => {
      const taskDoc = await transaction.get(taskRef);
      if (!taskDoc.exists()) {
        throw new Error(`Task ${taskId} does not exist in Firestore.`);
      }

      const taskData = taskDoc.data();
      const currentStatus = taskData.status || (taskData.done ? 'done' : 'todo');

      if (targetDone) {
        // 이미 완료된 경우 멱등적 탈출 (중복 갱신 원천 방지)
        if (currentStatus === 'done') {
          return;
        }

        // 1. 단일 task 문서의 원자적 상태 및 completedAt 갱신
        transaction.update(taskRef, {
          status: 'done',
          done: true,
          completedAt: nowKst,
          updatedAt: new Date().toISOString(),
        });

        // 2. 실행 기록 추가 (계획 본문 및 revisions는 절대 건드리지 않음)
        if (newLog) {
          const logRef = doc(db, 'executionLogs', newLog.id);
          transaction.set(logRef, {
            id: newLog.id,
            planId,
            taskId: newLog.taskId,
            taskTitle: newLog.taskTitle,
            completedAt: newLog.completedAt,
            startedAt: newLog.startedAt || null,
            endedAt: newLog.endedAt || null,
            impediment: newLog.impediment || '',
            comment: newLog.comment,
            createdAt: nowKst,
          });
        }
      } else {
        // 진행 중으로 복귀: 이미 진행 중이거나 done이 아닌 경우 중복 처리 방지
        if (currentStatus !== 'done') {
          return;
        }

        // 1. 상태를 in_progress로 되돌리고 completedAt 초기화
        transaction.update(taskRef, {
          status: 'in_progress',
          done: false,
          completedAt: null,
          updatedAt: new Date().toISOString(),
        });
      }
    });
  }
}

export const firestorePlanPackageRepository = new FirestorePlanPackageRepository();

