import React, { useState } from 'react';
import { PlanPackage, TaskItem, LogItem, TextRevision } from '../types/binder';
import { PlanSpreadView } from './PlanSpreadView';
import {
  Plus,
  CheckSquare,
  Square,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Clock,
  Sparkles,
  Lock,
} from 'lucide-react';

interface WritingCanvasProps {
  currentPackage: PlanPackage;
  currentSpread: number;
  onNavigateSpread: (spreadIndex: number) => void;
  onNavigateToTitlePage?: () => void;
  onUpdatePlan: (title: string, content: string) => void;
  onAddRevision: (rev: TextRevision) => void;
  onAddTask: (title: string) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTask: (taskId: string, comment?: string) => void;
  onUpdateLogComment: (logId: string, comment: string) => void;
  onApplyTasksTemplate: () => void;
  onConfirmPlan?: () => void;
  onAppendNewPlanPackage?: () => void;
  chapterNumber?: number;
}

type DynamicSpread =
  | { kind: 'plan'; planIndex: number; lineOffset: number }
  | { kind: 'blank' }
  | { kind: 'tasks'; tasksIndex: number; itemOffset: number }
  | { kind: 'logs'; logsIndex: number; itemOffset: number };

export const WritingCanvas: React.FC<WritingCanvasProps> = ({
  currentPackage,
  currentSpread,
  onNavigateSpread,
  onNavigateToTitlePage,
  onUpdatePlan,
  onAddRevision,
  onAddTask,
  onDeleteTask,
  onToggleTask,
  onUpdateLogComment,
  onApplyTasksTemplate,
  onConfirmPlan,
  onAppendNewPlanPackage,
  chapterNumber = 1,
}) => {
  const [newTaskInput, setNewTaskInput] = useState('');

  const { title: planTitle, content: planContent, revisions, tasks, logs, planStatus = 'draft' } = currentPackage;

  // 1. 계획 본문 줄 분할 (14줄 단위 스프레드 분할)
  const contentLines = planContent.split('\n').filter(Boolean);
  const planSpreadCount = Math.max(1, Math.ceil(contentLines.length / 14));

  // 2. 동적 속지 스택(Dynamic Leaf Stack) 구성
  const spreads: DynamicSpread[] = [];
  for (let i = 0; i < planSpreadCount; i++) {
    spreads.push({ kind: 'plan', planIndex: i, lineOffset: i * 14 });
  }

  // 3. 할 일 템플릿 적용 여부에 따라 백지 속지 또는 다중 할 일 속지 추가 (14개 단위 자동 연장)
  const isTasksApplied = Boolean(currentPackage.tasksTemplateApplied || currentPackage.tasks.length > 0);
  const tasksSpreadCount = isTasksApplied ? Math.max(1, Math.ceil(Math.max(1, tasks.length) / 14)) : 0;

  if (isTasksApplied) {
    for (let j = 0; j < tasksSpreadCount; j++) {
      spreads.push({ kind: 'tasks', tasksIndex: j, itemOffset: j * 14 });
    }
  } else {
    spreads.push({ kind: 'blank' });
  }

  // 4. 할 일이 1개 이상 완료되었거나 실행 로그가 있으면 실행 일지 속지 자동 활성화 (14개 단위 자동 연장)
  const hasCompletedTasks = currentPackage.tasks.some((t) => t.done) || currentPackage.logs.length > 0;
  const logsSpreadCount = hasCompletedTasks && isTasksApplied ? Math.max(1, Math.ceil(Math.max(1, logs.length) / 14)) : 0;

  if (hasCompletedTasks && isTasksApplied) {
    for (let k = 0; k < logsSpreadCount; k++) {
      spreads.push({ kind: 'logs', logsIndex: k, itemOffset: k * 14 });
    }
  }

  // 5. 유효한 현재 스프레드 인덱스 클램핑
  const safeSpreadIndex = Math.min(Math.max(0, currentSpread), spreads.length - 1);
  const activeSpread = spreads[safeSpreadIndex] || spreads[0];
  const isLastSpreadInPackage = safeSpreadIndex === spreads.length - 1;

  // 6. 계획별 스코프 페이지 번호 (PLAN CH.01 • P.01)
  const chStr = String(chapterNumber).padStart(2, '0');
  const leftPageNum = safeSpreadIndex * 2 + 1;
  const rightPageNum = leftPageNum + 1;
  const leftPageStr = `PLAN CH.${chStr} • P.${String(leftPageNum).padStart(2, '0')}`;
  const rightPageStr = `PLAN CH.${chStr} • P.${String(rightPageNum).padStart(2, '0')}`;

  // 할 일 추가 제출
  const handleAddTask = () => {
    const trimmed = newTaskInput.trim();
    if (!trimmed) return;
    onAddTask(trimmed);
    setNewTaskInput('');
  };

  // 한 면당 7개 기준 분할 (현재 할 일 스프레드 기준)
  const currentTasksChunk =
    activeSpread.kind === 'tasks' ? tasks.slice(activeSpread.itemOffset, activeSpread.itemOffset + 14) : [];
  const tasksLeft = currentTasksChunk.slice(0, 7);
  const tasksRight = currentTasksChunk.slice(7);

  // 한 면당 7개 기준 분할 (현재 실행 일지 스프레드 기준)
  const currentLogsChunk =
    activeSpread.kind === 'logs' ? logs.slice(activeSpread.itemOffset, activeSpread.itemOffset + 14) : [];
  const logsLeft = currentLogsChunk.slice(0, 7);
  const logsRight = currentLogsChunk.slice(7);

  return (
    <div className="relative w-full h-full flex transform-style-preserve-3d select-none z-20">
      {/* ---------------- 1. 계획 스프레드 (Plan Spread) ---------------- */}
      {activeSpread.kind === 'plan' && (
        <PlanSpreadView
          planTitle={planTitle}
          onUpdateTitle={(newTitle) => onUpdatePlan(newTitle, planContent)}
          planContent={planContent}
          onUpdateContent={(newContent) => onUpdatePlan(planTitle, newContent)}
          revisions={revisions}
          onAddRevision={onAddRevision}
          onNavigateNextSpread={() => onNavigateSpread(safeSpreadIndex + 1)}
          onNavigatePrevSpread={safeSpreadIndex > 0 ? () => onNavigateSpread(safeSpreadIndex - 1) : undefined}
          onNavigateToTitlePage={safeSpreadIndex === 0 ? onNavigateToTitlePage : undefined}
          startPage={leftPageNum}
          lineOffset={activeSpread.lineOffset}
          planStatus={planStatus}
          onConfirmPlan={onConfirmPlan}
          chapterNumber={chapterNumber}
          nextSpreadLabel={
            activeSpread.planIndex < planSpreadCount - 1
              ? '계획 다음 장 보기'
              : isTasksApplied
              ? '새 장 넘겨 할 일 확인'
              : '새 장 넘겨 할 일 속지'
          }
        />
      )}

      {/* ---------------- 2. 완전한 빈 속지 (Blank Spread) ---------------- */}
      {activeSpread.kind === 'blank' && (
        <>
          {/* 좌측 면 (480×640px) */}
          <div
            className="w-[480px] h-full p-8 flex flex-col justify-between border-r border-[#E7E5E4]"
            style={{ backgroundColor: 'var(--color-paper)' }}
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-stone-700">PLAN-DO-SEE</span>
                  <span className="font-mono text-[10px] text-stone-600 bg-stone-100 px-2 py-0.5 rounded border border-stone-200">
                    새로운 빈 속지 (Leaf)
                  </span>
                </div>
                <span className="font-mono text-[11px] text-stone-400">{leftPageStr}</span>
              </div>

              {/* 백지 판면 중앙 서식 날인 카드 & 라이프사이클 게이트 */}
              <div className="mt-12 p-6 rounded-xl border border-dashed border-stone-300 bg-white/70 shadow-xs flex flex-col items-center text-center space-y-3 backdrop-blur-2xs">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center shadow-2xs border ${
                    planStatus === 'confirmed'
                      ? 'bg-amber-100 border-amber-200 text-amber-800'
                      : 'bg-stone-100 border-stone-300 text-stone-400'
                  }`}
                >
                  {planStatus === 'confirmed' ? <CheckSquare className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>

                <div>
                  <h3 className="font-serif text-lg font-bold text-stone-900">
                    {planStatus === 'confirmed' ? '서식이 없는 백지 속지' : '계획 확정 대기 중'}
                  </h3>
                  <p className="font-sans text-xs text-stone-500 mt-1.5 leading-relaxed max-w-[280px]">
                    {planStatus === 'confirmed' ? (
                      <>
                        계획이 확정되었습니다.<br />
                        할 일 체크리스트 템플릿을 날인하여 구체적인 실행 항목을 배치하세요.
                      </>
                    ) : (
                      <>
                        계획이 아직 [작성 중] 상태입니다.<br />
                        계획을 먼저 확정 날인해야 할 일 서식을 찍을 수 있습니다.
                      </>
                    )}
                  </p>
                </div>

                {planStatus === 'confirmed' ? (
                  <button
                    type="button"
                    onClick={onApplyTasksTemplate}
                    className="mt-2 px-4 py-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-100 font-sans font-medium text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4 text-amber-300" />
                    <span>할 일 체크리스트 템플릿 날인</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNavigateSpread(safeSpreadIndex - 1)}
                    className="mt-2 px-4 py-2 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 font-sans font-medium text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>이전 장으로 돌아가 계획 확정하기</span>
                  </button>
                )}
              </div>
            </div>

            {/* 좌측 하단: 이전 장(계획) 버튼 */}
            <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onNavigateSpread(safeSpreadIndex - 1)}
                className="font-sans text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>이전 장 (계획)</span>
              </button>
              <span className="font-mono text-[10px] text-stone-400">{leftPageStr}</span>
            </div>
          </div>

          {/* 우측 면 (480×640px) */}
          <div
            className="w-[480px] h-full p-8 flex flex-col justify-between"
            style={{ backgroundColor: 'var(--color-paper)' }}
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <span className="font-mono text-xs font-semibold text-stone-700">BLANK EXTENSION</span>
                <span className="font-mono text-[11px] text-stone-400">{rightPageStr}</span>
              </div>

              <div className="mt-16 h-[340px] flex flex-col items-center justify-center text-center p-6 text-stone-400">
                <Sparkles className="w-8 h-8 text-stone-300 mb-2 stroke-1" />
                <p className="font-handwriting text-lg text-stone-500">
                  "백지 위에 서식을 찍는 순간,
                  <br />
                  생각은 실천이 됩니다."
                </p>
                <p className="font-sans text-[11px] text-stone-400 mt-2">
                  {planStatus === 'confirmed'
                    ? '좌측 페이지에서 할 일 템플릿을 적용해 시작하세요.'
                    : '계획을 먼저 확정한 뒤 서식을 날인하세요.'}
                </p>
              </div>
            </div>

            {/* 우측 하단 2-Way 다음 계획 결속 버튼 (스택의 마지막 속지인 경우) */}
            <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono text-stone-400">
              <span>{rightPageStr}</span>
              {isLastSpreadInPackage && onAppendNewPlanPackage && (
                <button
                  type="button"
                  onClick={onAppendNewPlanPackage}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-stone-100 font-sans font-medium text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                  title="다음 새 계획을 바인더 뒤에 결속합니다"
                >
                  <span>+ 새 계획 바인더에 결속</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ---------------- 3. 할 일 스프레드 (Tasks Spread - 14개 단위 다중 연장) ---------------- */}
      {activeSpread.kind === 'tasks' && (
        <>
          {/* 좌측 면 (Tasks Left: 480×640px) */}
          <div
            className="w-[480px] h-full p-8 flex flex-col justify-between border-r border-[#E7E5E4]"
            style={{ backgroundColor: 'var(--color-paper)' }}
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-stone-700">PLAN-DO-SEE</span>
                  <span className="font-mono text-[10px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    섹션 2: 할 일 (Tasks {activeSpread.tasksIndex + 1}/{tasksSpreadCount})
                  </span>
                </div>
                <span className="font-mono text-[11px] text-stone-400">{leftPageStr}</span>
              </div>

              <div className="mt-3 flex items-center justify-between pb-2 border-b border-stone-300">
                <span className="font-sans text-xs font-bold text-stone-800">
                  체크리스트 ({activeSpread.tasksIndex * 14 + 1}~{Math.min(tasks.length, (activeSpread.tasksIndex + 1) * 14)})
                </span>
                <span className="font-mono text-[10px] text-stone-400">{tasks.length} TASKS TOTAL</span>
              </div>

              {/* 할 일 좌측 7개 목록 */}
              <div className="mt-3 h-[380px] overflow-hidden space-y-2">
                {tasksLeft.map((task: TaskItem) => (
                  <div
                    key={task.id}
                    className="h-10 flex items-center justify-between px-2 rounded hover:bg-stone-50 transition-colors group cursor-pointer border-b border-stone-200/60"
                    onClick={() => onToggleTask(task.id)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {task.done ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-stone-400 flex-shrink-0" />
                      )}
                      <span
                        className={`font-handwriting text-base truncate ${
                          task.done ? 'line-through text-stone-400' : 'text-stone-900'
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTask(task.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-red-500 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {/* 할 일 추가 인풋 */}
                <div className="pt-2 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-stone-400 ml-1" />
                  <input
                    type="text"
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddTask();
                    }}
                    placeholder="+ 새 할 일 입력 후 Enter"
                    className="flex-1 bg-transparent font-handwriting text-base text-stone-800 outline-none placeholder:font-sans placeholder:text-xs placeholder:text-stone-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddTask}
                    className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-sans text-xs border border-stone-300 cursor-pointer"
                  >
                    추가
                  </button>
                </div>
              </div>
            </div>

            {/* 좌측 하단: 이전 장 버튼 */}
            <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onNavigateSpread(safeSpreadIndex - 1)}
                className="font-sans text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>이전 장</span>
              </button>
              <span className="font-mono text-[10px] text-stone-400">{leftPageStr}</span>
            </div>
          </div>

          {/* 우측 면 (Tasks Right: 480×640px) */}
          <div
            className="w-[480px] h-full p-8 flex flex-col justify-between"
            style={{ backgroundColor: 'var(--color-paper)' }}
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <span className="font-mono text-xs font-semibold text-stone-700">TASKS EXTENSION</span>
                <span className="font-mono text-[11px] text-stone-400">{rightPageStr}</span>
              </div>

              {/* 할 일 우측 7개 목록 */}
              <div className="mt-4 h-[400px] overflow-hidden space-y-2">
                {tasksRight.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 border border-dashed border-stone-200 rounded-lg bg-stone-50/40">
                    <Sparkles className="w-8 h-8 text-stone-300 mb-2 stroke-1" />
                    <p className="font-handwriting text-lg text-stone-500">
                      "할 일이 많아지면
                      <br />
                      우측 페이지로, 그리고 다음 속지로 이어집니다."
                    </p>
                    <p className="font-sans text-[11px] text-stone-400 mt-2">
                      14개가 넘으면 자동으로 다음 할 일 속지가 추가됩니다.
                    </p>
                  </div>
                ) : (
                  tasksRight.map((task: TaskItem) => (
                    <div
                      key={task.id}
                      className="h-10 flex items-center justify-between px-2 rounded hover:bg-stone-50 transition-colors group cursor-pointer border-b border-stone-200/60"
                      onClick={() => onToggleTask(task.id)}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {task.done ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-stone-400 flex-shrink-0" />
                        )}
                        <span
                          className={`font-handwriting text-base truncate ${
                            task.done ? 'line-through text-stone-400' : 'text-stone-900'
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTask(task.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-stone-300 hover:text-red-500 transition-opacity cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 우측 하단: 다음 속지 또는 다음 계획 바인더 결속 */}
            <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
              <span className="font-mono text-[10px] text-stone-400">{rightPageStr}</span>
              {activeSpread.tasksIndex < tasksSpreadCount - 1 ? (
                <button
                  type="button"
                  onClick={() => onNavigateSpread(safeSpreadIndex + 1)}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-stone-100 font-sans font-medium text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <span>다음 할 일 속지 보기</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : hasCompletedTasks ? (
                <button
                  type="button"
                  onClick={() => onNavigateSpread(safeSpreadIndex + 1)}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-stone-100 font-sans font-medium text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                  title="다음 새로운 속지로 넘어가 실행 일지 확인"
                >
                  <span>새 장 넘겨 실행 일지</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : isLastSpreadInPackage && onAppendNewPlanPackage ? (
                <button
                  type="button"
                  onClick={onAppendNewPlanPackage}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-stone-100 font-sans font-medium text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <span>+ 새 계획 바인더에 결속</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="text-[11px] font-sans text-stone-400">
                  할 일을 1개 이상 완료 시 실행 일지가 생성됩니다
                </span>
              )}
            </div>
          </div>
        </>
      )}

      {/* ---------------- 4. 실행 일지 스프레드 (Logs Spread - 14개 단위 다중 연장) ---------------- */}
      {activeSpread.kind === 'logs' && (
        <>
          {/* 좌측 면 (Logs Left: 480×640px) */}
          <div
            className="w-[480px] h-full p-8 flex flex-col justify-between border-r border-[#E7E5E4]"
            style={{ backgroundColor: 'var(--color-paper)' }}
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-stone-700">PLAN-DO-SEE</span>
                  <span className="font-mono text-[10px] text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                    섹션 3: 실행 일지 (Logs {activeSpread.logsIndex + 1}/{logsSpreadCount})
                  </span>
                </div>
                <span className="font-mono text-[11px] text-stone-400">{leftPageStr}</span>
              </div>

              <div className="mt-3 flex items-center justify-between pb-2 border-b border-stone-300">
                <span className="font-sans text-xs font-bold text-stone-800">
                  실행 발자취 ({activeSpread.logsIndex * 14 + 1}~{Math.min(logs.length, (activeSpread.logsIndex + 1) * 14)})
                </span>
                <span className="font-mono text-[10px] text-stone-400">{logs.length} RECORDS TOTAL</span>
              </div>

              {/* 실행 일지 목록 */}
              <div className="mt-3 h-[380px] overflow-hidden space-y-3">
                {logsLeft.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
                    <Clock className="w-8 h-8 text-stone-300 mb-2 stroke-1" />
                    <p className="font-handwriting text-lg text-stone-500">
                      "아직 완료된 할 일이 없습니다.
                      <br />
                      할 일을 체크하면 이곳에 잉크가 찍힙니다."
                    </p>
                  </div>
                ) : (
                  logsLeft.map((log: LogItem) => (
                    <div
                      key={log.id}
                      className="p-3 rounded bg-white/70 border border-stone-200 space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-stone-500 font-semibold">
                          [{log.completedAt}]
                        </span>
                        <span className="font-sans text-[10px] text-emerald-700 font-medium">
                          ✓ 완료
                        </span>
                      </div>
                      <div className="font-handwriting text-base text-stone-900 leading-snug">
                        {log.taskTitle}
                      </div>
                      <div className="pt-1 border-t border-stone-100">
                        <input
                          type="text"
                          value={log.comment}
                          onChange={(e) => onUpdateLogComment(log.id, e.target.value)}
                          placeholder="한 줄 소회나 막혔던 이유를 적으세요"
                          className="w-full bg-transparent font-handwriting text-xs text-stone-600 outline-none placeholder:font-sans placeholder:text-[10px] placeholder:text-stone-400"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 좌측 하단 이전 장 버튼 */}
            <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onNavigateSpread(safeSpreadIndex - 1)}
                className="font-sans text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>이전 장</span>
              </button>
              <span className="font-mono text-[10px] text-stone-400">{leftPageStr}</span>
            </div>
          </div>

          {/* 우측 면 (Logs Right: 480×640px) */}
          <div
            className="w-[480px] h-full p-8 flex flex-col justify-between"
            style={{ backgroundColor: 'var(--color-paper)' }}
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <span className="font-mono text-xs font-semibold text-stone-700">LOG ARCHIVE</span>
                <span className="font-mono text-[11px] text-stone-400">{rightPageStr}</span>
              </div>

              <div className="mt-4 h-[400px] overflow-hidden space-y-3">
                {logsRight.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 border border-dashed border-stone-200 rounded-lg bg-stone-50/40">
                    <p className="font-handwriting text-lg text-stone-500">
                      "실행의 기록이 쌓여갈수록
                      <br />
                      삶의 궤적이 뚜렷해집니다."
                    </p>
                  </div>
                ) : (
                  logsRight.map((log: LogItem) => (
                    <div
                      key={log.id}
                      className="p-3 rounded bg-white/70 border border-stone-200 space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] text-stone-500">
                          [{log.completedAt}]
                        </span>
                        <span className="font-sans text-[10px] text-emerald-700">✓ 완료</span>
                      </div>
                      <div className="font-handwriting text-base text-stone-900">
                        {log.taskTitle}
                      </div>
                      <div className="pt-1 border-t border-stone-100">
                        <input
                          type="text"
                          value={log.comment}
                          onChange={(e) => onUpdateLogComment(log.id, e.target.value)}
                          placeholder="한 줄 소회 기록"
                          className="w-full bg-transparent font-handwriting text-xs text-stone-600 outline-none"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 우측 하단 2-Way 다음 계획 결속 버튼 */}
            <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono text-stone-400">
              <span className="font-mono text-[10px] text-stone-400">{rightPageStr}</span>
              {activeSpread.logsIndex < logsSpreadCount - 1 ? (
                <button
                  type="button"
                  onClick={() => onNavigateSpread(safeSpreadIndex + 1)}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-stone-100 font-sans font-medium text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <span>다음 일지 속지 보기</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : isLastSpreadInPackage && onAppendNewPlanPackage ? (
                <button
                  type="button"
                  onClick={onAppendNewPlanPackage}
                  className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-100 font-sans font-medium text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                  title="다음 새 계획을 바인더 뒤에 결속합니다"
                >
                  <span>+ 다음 계획 바인더에 결속</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
