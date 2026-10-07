import {
  collection,
  doc,
  writeBatch,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type {
  PlanPackage,
  TaskItem,
  LogItem,
  TextRevision,
  IPlanPackageRepository,
} from '../types/binder';
import { INITIAL_PLAN_PACKAGES } from './planPackageService';

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
        });

        // 2. tasks 컬렉션 문서 분해
        for (const task of pkg.tasks) {
          const taskRef = doc(db, 'tasks', task.id);
          batch.set(taskRef, {
            id: task.id,
            planId: pkg.id,
            title: task.title,
            done: task.done,
            createdAt: task.createdAt,
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
            comment: log.comment,
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
          .map((t) => ({
            id: t.id,
            title: t.title,
            done: !!t.done,
            createdAt: t.createdAt,
          }));

        const planLogs: LogItem[] = logDocs
          .filter((l) => l.planId === p.id)
          .map((l) => ({
            id: l.id,
            taskId: l.taskId,
            taskTitle: l.taskTitle,
            completedAt: l.completedAt,
            comment: l.comment,
          }));

        return {
          id: p.id,
          title: p.title || '',
          content: p.content || '',
          revisions: p.revisions || [],
          startPage: p.startPage || 1,
          tasks: planTasks,
          logs: planLogs,
          tasksTemplateApplied: p.tasksTemplateApplied,
          planStatus: p.planStatus,
          period: p.period || undefined,
          createdAt: p.createdAt || new Date().toISOString().split('T')[0],
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
      });

      // 2. tasks 컬렉션 원자적 저장
      for (const task of pkg.tasks) {
        const taskRef = doc(db, 'tasks', task.id);
        batch.set(taskRef, {
          id: task.id,
          planId: pkg.id,
          title: task.title,
          done: task.done,
          createdAt: task.createdAt,
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
          comment: log.comment,
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

  addTask(pkgId: string, title: string): PlanPackage {
    const target = this.cache.find((p) => p.id === pkgId);
    if (!target) return this.cache[0];
    const newTask: TaskItem = {
      id: `t-${Date.now()}`,
      title: title.trim(),
      done: false,
      createdAt: new Date().toISOString().split('T')[0],
    };
    const newPkg: PlanPackage = { ...target, tasks: [...target.tasks, newTask] };
    this.cache = this.cache.map((p) => (p.id === pkgId ? newPkg : p));
    this.saveToLocal();
    this.syncPackageToFirestore(newPkg);
    return newPkg;
  }

  deleteTask(pkgId: string, taskId: string): PlanPackage {
    const target = this.cache.find((p) => p.id === pkgId);
    if (!target) return this.cache[0];
    const newPkg: PlanPackage = {
      ...target,
      tasks: target.tasks.filter((t) => t.id !== taskId),
      logs: target.logs.filter((l) => l.taskId !== taskId),
    };
    this.cache = this.cache.map((p) => (p.id === pkgId ? newPkg : p));
    this.saveToLocal();
    this.syncPackageToFirestore(newPkg, [taskId]);
    return newPkg;
  }

  updateLogComment(pkgId: string, logId: string, comment: string): PlanPackage {
    const target = this.cache.find((p) => p.id === pkgId);
    if (!target) return this.cache[0];
    const newPkg: PlanPackage = {
      ...target,
      logs: target.logs.map((l) => (l.id === logId ? { ...l, comment } : l)),
    };
    this.cache = this.cache.map((p) => (p.id === pkgId ? newPkg : p));
    this.saveToLocal();
    this.syncPackageToFirestore(newPkg);
    return newPkg;
  }

  toggleTaskDone(
    pkgId: string,
    taskId: string,
    comment?: string
  ): { packages: PlanPackage[]; updatedPkg: PlanPackage } {
    let targetPkg = this.cache.find((p) => p.id === pkgId);
    if (!targetPkg) return { packages: this.cache, updatedPkg: this.cache[0] };

    const targetTask = targetPkg.tasks.find((t) => t.id === taskId);
    if (!targetTask) return { packages: this.cache, updatedPkg: targetPkg };

    const nextDone = !targetTask.done;
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateStr = `${String(now.getFullYear()).slice(2)}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;

    let updatedLogs = [...targetPkg.logs];
    if (nextDone) {
      const newLog: LogItem = {
        id: `log-${Date.now()}`,
        taskId: targetTask.id,
        taskTitle: targetTask.title,
        completedAt: `${dateStr} ${timeStr}`,
        comment: comment || '할 일을 완수하고 실행 성찰을 남깁니다.',
      };
      updatedLogs.push(newLog);
    } else {
      updatedLogs = updatedLogs.filter((l) => l.taskId !== taskId);
    }

    const updatedTasks = targetPkg.tasks.map((t) => (t.id === taskId ? { ...t, done: nextDone } : t));
    const newPkg: PlanPackage = {
      ...targetPkg,
      tasks: updatedTasks,
      logs: updatedLogs,
    };

    this.cache = this.cache.map((p) => (p.id === pkgId ? newPkg : p));
    this.saveToLocal();
    this.syncPackageToFirestore(newPkg);
    return { packages: this.cache, updatedPkg: newPkg };
  }
}

export const firestorePlanPackageRepository = new FirestorePlanPackageRepository();
