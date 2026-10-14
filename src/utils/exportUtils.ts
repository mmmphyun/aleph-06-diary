import { PlanPackage } from '../types/binder';

export interface ExportDataStructure {
  contractVersion: string;
  exportedAt: string;
  data: {
    plans: Array<{
      id: string;
      title: string;
      content: string;
      periodStart: string;
      periodEnd: string;
      priority: string;
      revisionCount: number;
      trashStatus: number;
      trashedAt: string | null;
      retentionDays: number;
      createdAt: string;
    }>;
    planRevisions: Array<{
      id: string;
      planId: string;
      startIndex: number;
      endIndex: number;
      originalText: string;
      correctedText: string;
      trashStatus: number;
      trashedAt: string | null;
      createdAt: string;
    }>;
    tasks: Array<{
      id: string;
      planId: string;
      title: string;
      description: string;
      startDate: string;
      dueDate: string;
      priority: string;
      tags: string[];
      estimatedMinutes: number;
      status: string;
      done: boolean;
      completedAt: string | null;
      trashStatus: number;
      trashedAt: string | null;
      retentionDays: number;
      createdAt: string;
    }>;
    executionLogs: Array<{
      id: string;
      planId: string;
      taskId: string;
      taskTitle: string;
      startedAt: string | null;
      endedAt: string | null;
      actualMinutes: number;
      impediment: string;
      comment: string;
      completedAt: string;
      trashStatus: number;
      trashedAt: string | null;
      retentionDays: number;
    }>;
  };
}

/**
 * M6 / 확정 결정 7번: 전체 자료 UTF-8 JSON 백업 데이터 생성 함수
 * - 휴지통 데이터(trashStatus === 1)를 100% 포함하여 백업의 완전성을 보장함
 * - ID, 날짜(YYYY-MM-DD), 단위(분), 시각(KST/ISO) 완전 보존
 * - 비밀값/세션 토큰 원천 차단
 */
export function generateExportData(packages: PlanPackage[]): ExportDataStructure {
  const exportedAt = new Date().toISOString();

  const plans = packages.map((pkg) => {
    return {
      id: pkg.id,
      title: pkg.title,
      content: pkg.content,
      periodStart: pkg.period?.start || pkg.createdAt,
      periodEnd: pkg.period?.end || pkg.period?.start || pkg.createdAt,
      priority: 'high',
      revisionCount: pkg.revisions?.length ?? 0,
      trashStatus: pkg.trashStatus ?? 0,
      trashedAt: pkg.trashedAt ?? null,
      retentionDays: pkg.retentionDays ?? 7,
      createdAt: pkg.createdAt,
    };
  });

  const planRevisions = packages.flatMap((pkg) =>
    (pkg.revisions || []).map((rev) => ({
      id: rev.id,
      planId: pkg.id,
      startIndex: rev.startIndex,
      endIndex: rev.endIndex,
      originalText: rev.originalText,
      correctedText: rev.correctedText,
      trashStatus: rev.trashStatus ?? pkg.trashStatus ?? 0,
      trashedAt: rev.trashedAt ?? pkg.trashedAt ?? null,
      createdAt: rev.createdAt,
    }))
  );

  const tasks = packages.flatMap((pkg) =>
    (pkg.tasks || []).map((t) => ({
      id: t.id,
      planId: pkg.id,
      title: t.title,
      description: t.description || '',
      startDate: t.startDate,
      dueDate: t.dueDate,
      priority: t.priority,
      tags: t.tags || [],
      estimatedMinutes: t.estimatedMinutes ?? 60,
      status: t.status,
      done: t.done,
      completedAt: t.completedAt ?? null,
      trashStatus: t.trashStatus ?? 0,
      trashedAt: t.trashedAt ?? null,
      retentionDays: t.retentionDays ?? 7,
      createdAt: t.createdAt,
    }))
  );

  const executionLogs = packages.flatMap((pkg) =>
    (pkg.logs || []).map((l) => ({
      id: l.id,
      planId: pkg.id,
      taskId: l.taskId,
      taskTitle: l.taskTitle,
      startedAt: l.startedAt ?? null,
      endedAt: l.endedAt ?? null,
      actualMinutes: l.actualMinutes ?? 0,
      impediment: l.impediment || '',
      comment: l.comment || '',
      completedAt: l.completedAt,
      trashStatus: l.trashStatus ?? 0,
      trashedAt: l.trashedAt ?? null,
      retentionDays: l.retentionDays ?? 7,
    }))
  );

  return {
    contractVersion: '2.1.0',
    exportedAt,
    data: {
      plans,
      planRevisions,
      tasks,
      executionLogs,
    },
  };
}

/**
 * 브라우저 환경에서 UTF-8 JSON 파일 다운로드 트리거
 */
export function downloadBackupJson(
  exportData: ExportDataStructure,
  filename?: string
): void {
  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const dateStr = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = filename || `pds-diary-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
