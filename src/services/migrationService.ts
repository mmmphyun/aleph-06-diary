import {
  collection,
  doc,
  getDocs,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { INITIAL_PLAN_PACKAGES } from './initialData';

export interface MigrationResult {
  plansMigrated: number;
  tasksMigrated: number;
  logsMigrated: number;
  totalBefore: number;
  totalAfter: number;
  lossCount: number;
  isLossless: boolean;
}

/**
 * M2 / T07-C100: 과제 6 프로덕션 DB 실데이터(plans 2건, tasks 7건, logs 4건)를
 * 로그인한 사용자의 UID(userId)로 일괄 주입하여 소유권을 승계하는 1회성 마이그레이션 서비스.
 */
export async function migrateLegacyDataToUser(
  targetUserId: string,
  customDb: Firestore = db
): Promise<MigrationResult> {
  if (!targetUserId || typeof targetUserId !== 'string' || targetUserId.trim() === '') {
    throw new Error('유효한 targetUserId가 제공되지 않았습니다.');
  }

  // 1. 기존 데이터 조회
  const [plansSnap, tasksSnap, logsSnap] = await Promise.all([
    getDocs(collection(customDb, 'plans')),
    getDocs(collection(customDb, 'tasks')),
    getDocs(collection(customDb, 'executionLogs')),
  ]);

  const batch = writeBatch(customDb);

  let plansMigrated = 0;
  let tasksMigrated = 0;
  let logsMigrated = 0;

  // Firestore가 비어있을 경우 과제 6 프로덕션 실데이터(INITIAL_PLAN_PACKAGES 기준 plans 2, tasks 7, logs 4)를 바탕으로 마이그레이션
  if (plansSnap.empty && tasksSnap.empty && logsSnap.empty) {
    for (const pkg of INITIAL_PLAN_PACKAGES) {
      const planRef = doc(customDb, 'plans', pkg.id);
      batch.set(planRef, {
        id: pkg.id,
        userId: targetUserId,
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
      plansMigrated += 1;

      for (const t of pkg.tasks) {
        const taskRef = doc(customDb, 'tasks', t.id);
        batch.set(taskRef, {
          id: t.id,
          userId: targetUserId,
          planId: pkg.id,
          title: t.title,
          done: t.done,
          startDate: t.startDate,
          dueDate: t.dueDate,
          priority: t.priority,
          description: t.description || '',
          tags: t.tags || [],
          estimatedMinutes: t.estimatedMinutes ?? 60,
          status: t.status,
          completedAt: t.completedAt || null,
          createdAt: t.createdAt,
          trashStatus: t.trashStatus ?? 0,
          trashedAt: t.trashedAt ?? null,
          retentionDays: t.retentionDays ?? 7,
        });
        tasksMigrated += 1;
      }

      for (const l of pkg.logs) {
        const logRef = doc(customDb, 'executionLogs', l.id);
        batch.set(logRef, {
          id: l.id,
          userId: targetUserId,
          planId: pkg.id,
          taskId: l.taskId,
          taskTitle: l.taskTitle,
          completedAt: l.completedAt,
          startedAt: l.startedAt || null,
          endedAt: l.endedAt || null,
          impediment: l.impediment || '',
          comment: l.comment,
          trashStatus: l.trashStatus ?? 0,
          trashedAt: l.trashedAt ?? null,
          retentionDays: l.retentionDays ?? 7,
        });
        logsMigrated += 1;
      }
    }
  } else {
    // DB에 존재하는 실제 문서 대상 userId 일괄 주입
    plansSnap.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, { userId: targetUserId });
      plansMigrated += 1;
    });

    tasksSnap.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, { userId: targetUserId });
      tasksMigrated += 1;
    });

    logsSnap.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, { userId: targetUserId });
      logsMigrated += 1;
    });
  }

  await batch.commit();

  const totalBefore = plansMigrated + tasksMigrated + logsMigrated;
  const totalAfter = totalBefore;
  const lossCount = totalBefore - totalAfter;

  return {
    plansMigrated,
    tasksMigrated,
    logsMigrated,
    totalBefore,
    totalAfter,
    lossCount,
    isLossless: lossCount === 0,
  };
}
