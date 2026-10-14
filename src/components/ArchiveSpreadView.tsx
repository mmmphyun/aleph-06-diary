import React, { useState, useMemo } from 'react';
import { PlanPackage, TaskItem, LogItem } from '../types/binder';
import { generateExportData, downloadBackupJson } from '../utils/exportUtils';
import {
  Trash2,
  RotateCcw,
  Download,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileText,
  CheckSquare,
  Clock,
  Sparkles,
} from 'lucide-react';

interface ArchiveSpreadViewProps {
  packages: PlanPackage[];
  onRestorePlan: (pkgId: string) => void;
  onPurgePlan: (pkgId: string) => void;
  onRestoreTask: (pkgId: string, taskId: string) => void;
  onPurgeTask: (pkgId: string, taskId: string) => void;
  onRestoreLog: (pkgId: string, logId: string) => void;
  onPurgeLog: (pkgId: string, logId: string) => void;
  onPurgeExpired: () => void;
}

function getRemainingDays(trashedAt?: string | null): number {
  if (!trashedAt) return 7;
  const t = new Date(trashedAt).getTime();
  if (isNaN(t)) return 7;
  const diff = t + 7 * 24 * 60 * 60 * 1000 - Date.now();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

export const ArchiveSpreadView: React.FC<ArchiveSpreadViewProps> = ({
  packages,
  onRestorePlan,
  onPurgePlan,
  onRestoreTask,
  onPurgeTask,
  onRestoreLog,
  onPurgeLog,
  onPurgeExpired,
}) => {
  // 좌측(계획) 페이지네이션: 4건 단위 무스크롤
  const [planPage, setPlanPage] = useState<number>(0);
  // 우측(할일/일지) 탭: 'tasks' | 'logs'
  const [rightTab, setRightTab] = useState<'tasks' | 'logs'>('tasks');
  // 우측 페이지네이션: 4건 단위 무스크롤
  const [rightPage, setRightPage] = useState<number>(0);

  // 1. 휴지통 계획 목록 (trashStatus === 1)
  const trashedPlans = useMemo(() => {
    return packages.filter((p) => p.trashStatus === 1);
  }, [packages]);

  // 2. 휴지통 할 일 목록 (trashStatus === 1)
  const trashedTasks = useMemo(() => {
    return packages.flatMap((pkg) =>
      pkg.tasks
        .filter((t) => t.trashStatus === 1)
        .map((task) => ({ ...task, planId: pkg.id, planTitle: pkg.title }))
    );
  }, [packages]);

  // 3. 휴지통 실행 일지 목록 (trashStatus === 1)
  const trashedLogs = useMemo(() => {
    return packages.flatMap((pkg) =>
      pkg.logs
        .filter((l) => l.trashStatus === 1)
        .map((log) => ({ ...log, planId: pkg.id, planTitle: pkg.title }))
    );
  }, [packages]);

  // 페이지네이션 슬라이스
  const ITEMS_PER_PAGE = 4;
  const totalPlanPages = Math.max(1, Math.ceil(trashedPlans.length / ITEMS_PER_PAGE));
  const visiblePlans = trashedPlans.slice(
    planPage * ITEMS_PER_PAGE,
    (planPage + 1) * ITEMS_PER_PAGE
  );

  const currentRightItems = rightTab === 'tasks' ? trashedTasks : trashedLogs;
  const totalRightPages = Math.max(1, Math.ceil(currentRightItems.length / ITEMS_PER_PAGE));
  const visibleRightItems = currentRightItems.slice(
    rightPage * ITEMS_PER_PAGE,
    (rightPage + 1) * ITEMS_PER_PAGE
  );

  // 전체 UTF-8 JSON 백업 내보내기 핸들러
  const handleExportAll = () => {
    const exportData = generateExportData(packages);
    downloadBackupJson(exportData);
  };

  return (
    <div className="w-full h-full flex">
      {/* ========================================================================= */}
      {/* [좌측 480px] 삭제된 계획 보관함 (찢긴 종이, 구겨진 음영, 마스킹 테이프 연출) */}
      {/* ========================================================================= */}
      <div
        className="w-[480px] h-full p-8 flex flex-col justify-between border-r border-stone-200"
        style={{ backgroundColor: 'var(--color-paper)' }}
      >
        <div>
          {/* 상단 헤더 & 페이지 번호 */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-purple-700" />
              <span className="font-mono text-xs font-semibold text-stone-700">ARCHIVE SECTION</span>
            </div>
            <span className="font-mono text-[11px] text-stone-400">ARCHIVE P.01</span>
          </div>

          {/* 타이틀 및 설명 */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl text-stone-800">지워진 생각의 보관함</h2>
              <button
                type="button"
                onClick={handleExportAll}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-medium text-emerald-800 bg-emerald-50 border border-emerald-300 rounded shadow-2xs hover:bg-emerald-100 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
                title="전체 자료(휴지통 포함)를 UTF-8 JSON 단일 파일로 다운로드합니다"
              >
                <Download className="w-3.5 h-3.5" />
                <span>JSON 내보내기</span>
              </button>
            </div>
            <p className="font-sans text-xs text-stone-500 mt-1 leading-relaxed">
              삭제된 계획은 구겨진 종이와 마스킹 테이프로 7일간 보존되며 언제든 복구할 수 있습니다.
            </p>
          </div>

          {/* 삭제된 계획 목록 (무스크롤 4건) */}
          <div className="mt-5 space-y-3">
            {visiblePlans.length === 0 ? (
              <div className="p-8 text-center rounded-lg border border-dashed border-stone-300 bg-stone-50/60 mt-6">
                <Sparkles className="w-6 h-6 text-stone-400 mx-auto mb-2" />
                <p className="font-serif text-sm text-stone-600">휴지통에 보관된 계획이 없습니다.</p>
                <p className="font-sans text-xs text-stone-400 mt-1">모든 활성 계획이 안전하게 보존 중입니다.</p>
              </div>
            ) : (
              visiblePlans.map((pkg) => {
                const dDay = getRemainingDays(pkg.trashedAt);
                return (
                  <div
                    key={pkg.id}
                    className="relative p-3.5 rounded-lg bg-stone-100/90 border border-dashed border-stone-300 shadow-2xs transition-colors hover:bg-stone-100"
                  >
                    {/* 상단 마스킹 테이프 연출 바 */}
                    <div className="absolute -top-2 left-6 w-16 h-3.5 bg-amber-200/70 border-t border-b border-amber-300/80 -rotate-2 rounded-xs pointer-events-none" />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate max-w-[270px]">
                        <FileText className="w-4 h-4 text-stone-500 shrink-0" />
                        <span className="font-serif text-sm text-stone-700 line-through truncate">
                          {pkg.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold shrink-0">
                        {dDay === 0 ? '만료 임박' : `D-${dDay}`}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-xs pt-2 border-t border-stone-200/60">
                      <span className="font-mono text-[10px] text-stone-400">
                        {`연결 할 일 ${pkg.tasks.length}개 • 일지 ${pkg.logs.length}건`}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onRestorePlan(pkg.id)}
                          className="flex items-center gap-1 text-[11px] text-blue-700 hover:text-blue-900 font-medium cursor-pointer focus-visible:ring-1 focus-visible:ring-blue-500"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>계획 복구</span>
                        </button>
                        <span className="text-stone-300">|</span>
                        <button
                          type="button"
                          onClick={() => onPurgePlan(pkg.id)}
                          className="text-[11px] text-red-600 hover:text-red-800 font-medium cursor-pointer focus-visible:ring-1 focus-visible:ring-red-500"
                        >
                          영구 삭제
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 좌측 하단: 페이지네이션 및 푸터 */}
        <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[11px] font-mono text-stone-500">
          <div className="flex items-center gap-2">
            <span>{`보관된 계획 ${trashedPlans.length}건`}</span>
            {totalPlanPages > 1 && (
              <div className="flex items-center gap-1 ml-2">
                <button
                  type="button"
                  disabled={planPage === 0}
                  onClick={() => setPlanPage((p) => Math.max(0, p - 1))}
                  className="p-0.5 rounded hover:bg-stone-200 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] text-stone-400">{`${planPage + 1} / ${totalPlanPages}`}</span>
                <button
                  type="button"
                  disabled={planPage >= totalPlanPages - 1}
                  onClick={() => setPlanPage((p) => Math.min(totalPlanPages - 1, p + 1))}
                  className="p-0.5 rounded hover:bg-stone-200 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          <span>ARCHIVE P.01</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* [우측 480px] 삭제된 할 일 및 실행 일지 보관함 */}
      {/* ========================================================================= */}
      <div
        className="w-[480px] h-full p-8 flex flex-col justify-between"
        style={{ backgroundColor: 'var(--color-paper)' }}
      >
        <div>
          {/* 상단 헤더 & 페이지 번호 */}
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            {/* 할 일 / 실행 일지 전환 탭 */}
            <div className="flex items-center gap-1.5 bg-stone-100 p-0.5 rounded border border-stone-200">
              <button
                type="button"
                onClick={() => {
                  setRightTab('tasks');
                  setRightPage(0);
                }}
                className={`px-2 py-0.5 text-xs font-mono rounded cursor-pointer transition-colors ${
                  rightTab === 'tasks'
                    ? 'bg-white text-stone-800 font-semibold shadow-2xs'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {`삭제된 할 일 (${trashedTasks.length})`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setRightTab('logs');
                  setRightPage(0);
                }}
                className={`px-2 py-0.5 text-xs font-mono rounded cursor-pointer transition-colors ${
                  rightTab === 'logs'
                    ? 'bg-white text-stone-800 font-semibold shadow-2xs'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {`삭제된 일지 (${trashedLogs.length})`}
              </button>
            </div>
            <span className="font-mono text-[11px] text-stone-400">ARCHIVE P.02</span>
          </div>

          {/* 타이틀 및 설명 */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-2xl text-stone-800">
                {rightTab === 'tasks' ? '삭제된 할 일 조각' : '삭제된 실행 일지'}
              </h2>
              <button
                type="button"
                onClick={onPurgeExpired}
                className="flex items-center gap-1 px-2 py-1 text-[11px] font-mono text-stone-600 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded cursor-pointer focus-visible:ring-1 focus-visible:ring-stone-400"
                title="7일 보존 기간이 만료된 항목들을 즉시 영구 정리합니다"
              >
                <AlertTriangle className="w-3 h-3 text-amber-600" />
                <span>만료 정리</span>
              </button>
            </div>
            <p className="font-sans text-xs text-stone-500 mt-1 leading-relaxed">
              {rightTab === 'tasks'
                ? '단독 또는 연쇄 삭제된 할 일 항목입니다. 복구 시 연결된 일지도 함께 복구됩니다.'
                : '실행 일지 단독 삭제 항목입니다. 실행 성찰과 소요 시간 기록이 보존되어 있습니다.'}
            </p>
          </div>

          {/* 목록 렌더링 (4건 단위 무스크롤) */}
          <div className="mt-5 space-y-3">
            {visibleRightItems.length === 0 ? (
              <div className="p-8 text-center rounded-lg border border-dashed border-stone-300 bg-stone-50/60 mt-6">
                <CheckSquare className="w-6 h-6 text-stone-400 mx-auto mb-2" />
                <p className="font-serif text-sm text-stone-600">
                  {rightTab === 'tasks'
                    ? '보관된 삭제 할 일이 없습니다.'
                    : '보관된 삭제 일지가 없습니다.'}
                </p>
                <p className="font-sans text-xs text-stone-400 mt-1">깨끗한 휴지통 상태를 유지하고 있습니다.</p>
              </div>
            ) : rightTab === 'tasks' ? (
              (visibleRightItems as Array<TaskItem & { planId: string; planTitle: string }>).map((task) => {
                const dDay = getRemainingDays(task.trashedAt);
                return (
                  <div
                    key={task.id}
                    className="p-3 rounded bg-white border border-stone-200 shadow-2xs opacity-90 hover:opacity-100 transition-opacity"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate max-w-[270px]">
                        <CheckSquare className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="text-xs font-serif text-stone-600 line-through truncate">
                          {task.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 shrink-0">
                        {`D-${dDay}`}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-stone-100">
                      <span className="font-mono text-[10px] text-stone-400 truncate max-w-[160px]">
                        {task.planTitle}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onRestoreTask(task.planId, task.id)}
                          className="flex items-center gap-0.5 text-blue-700 hover:text-blue-900 font-medium cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>복구</span>
                        </button>
                        <span className="text-stone-300">|</span>
                        <button
                          type="button"
                          onClick={() => onPurgeTask(task.planId, task.id)}
                          className="text-stone-500 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          영구 삭제
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              (visibleRightItems as Array<LogItem & { planId: string; planTitle: string }>).map((log) => {
                const dDay = getRemainingDays(log.trashedAt);
                return (
                  <div
                    key={log.id}
                    className="p-3 rounded bg-white border border-stone-200 shadow-2xs opacity-90 hover:opacity-100 transition-opacity"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate max-w-[270px]">
                        <Clock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                        <span className="text-xs font-serif text-stone-600 line-through truncate">
                          {log.taskTitle}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 shrink-0">
                        {`D-${dDay}`}
                      </span>
                    </div>

                    {log.comment && (
                      <p className="font-sans text-[11px] text-stone-500 mt-1 line-clamp-1 italic">
                        {`"${log.comment}"`}
                      </p>
                    )}

                    <div className="mt-2 flex items-center justify-between text-[11px] pt-1.5 border-t border-stone-100">
                      <span className="font-mono text-[10px] text-stone-400">
                        {log.actualMinutes ? `${log.actualMinutes}분 소요` : '완료 기록'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onRestoreLog(log.planId, log.id)}
                          className="flex items-center gap-0.5 text-blue-700 hover:text-blue-900 font-medium cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>복구</span>
                        </button>
                        <span className="text-stone-300">|</span>
                        <button
                          type="button"
                          onClick={() => onPurgeLog(log.planId, log.id)}
                          className="text-stone-500 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          영구 삭제
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 우측 하단: 페이지네이션 및 푸터 */}
        <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[11px] font-mono text-stone-500">
          <div className="flex items-center gap-2">
            <span>{`보관된 항목 ${currentRightItems.length}건`}</span>
            {totalRightPages > 1 && (
              <div className="flex items-center gap-1 ml-2">
                <button
                  type="button"
                  disabled={rightPage === 0}
                  onClick={() => setRightPage((p) => Math.max(0, p - 1))}
                  className="p-0.5 rounded hover:bg-stone-200 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] text-stone-400">{`${rightPage + 1} / ${totalRightPages}`}</span>
                <button
                  type="button"
                  disabled={rightPage >= totalRightPages - 1}
                  onClick={() => setRightPage((p) => Math.min(totalRightPages - 1, p + 1))}
                  className="p-0.5 rounded hover:bg-stone-200 disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
          <span>ARCHIVE P.02</span>
        </div>
      </div>
    </div>
  );
};
