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
}

type DynamicSpread =
  | { kind: 'plan'; planIndex: number; lineOffset: number }
  | { kind: 'blank' }
  | { kind: 'tasks' }
  | { kind: 'logs' };

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
}) => {
  const [newTaskInput, setNewTaskInput] = useState('');

  const { title: planTitle, content: planContent, revisions, tasks, logs } = currentPackage;
  const startPage = currentPackage.startPage || 1;

  // 계획 본문 줄 분할 (14줄 단위 스프레드 분할)
  const contentLines = planContent.split('\n').filter(Boolean);
  const planSpreadCount = Math.max(1, Math.ceil(contentLines.length / 14));

  // 동적 속지 스택(Dynamic Leaf Stack) 구성
  const spreads: DynamicSpread[] = [];
  for (let i = 0; i < planSpreadCount; i++) {
    spreads.push({ kind: 'plan', planIndex: i, lineOffset: i * 14 });
  }

  // 할 일 템플릿 적용 여부에 따라 백지 속지 또는 할 일 속지 추가
  const isTasksApplied = Boolean(currentPackage.tasksTemplateApplied || currentPackage.tasks.length > 0);
  if (isTasksApplied) {
    spreads.push({ kind: 'tasks' });
  } else {
    spreads.push({ kind: 'blank' });
  }

  // 할 일이 1개 이상 완료되었거나 실행 로그가 있으면 실행 일지 속지 자동 활성화
  const hasCompletedTasks = currentPackage.tasks.some((t) => t.done) || currentPackage.logs.length > 0;
  if (hasCompletedTasks && isTasksApplied) {
    spreads.push({ kind: 'logs' });
  }

  // 유효한 현재 스프레드 인덱스 클램핑
  const safeSpreadIndex = Math.min(Math.max(0, currentSpread), spreads.length - 1);
  const activeSpread = spreads[safeSpreadIndex] || spreads[0];

  // 동적 페이지 번호
  const leftPageNum = startPage + safeSpreadIndex * 2;
  const rightPageNum = leftPageNum + 1;
  const leftPageStr = `PAGE ${String(leftPageNum).padStart(2, '0')}`;
  const rightPageStr = `PAGE ${String(rightPageNum).padStart(2, '0')}`;

  // 할 일 추가 제출
  const handleAddTask = () => {
    const trimmed = newTaskInput.trim();
    if (!trimmed) return;
    onAddTask(trimmed);
    setNewTaskInput('');
  };

  // 한 면당 7줄 기준 분할
  const LINES_PER_PAGE = 7;
  const tasksLeft = tasks.slice(0, LINES_PER_PAGE);
  const tasksRight = tasks.slice(LINES_PER_PAGE);

  const logsLeft = logs.slice(0, LINES_PER_PAGE);
  const logsRight = logs.slice(LINES_PER_PAGE);

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

              {/* 백지 판면 중앙 서식 날인 카드 */}
              <div className="mt-14 p-6 rounded-xl border border-dashed border-stone-300 bg-white/70 shadow-xs flex flex-col items-center text-center space-y-3 backdrop-blur-2xs">
                <div className="w-11 h-11 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-800 shadow-2xs">
                  <CheckSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-stone-900">서식이 없는 백지 속지</h3>
                  <p className="font-sans text-xs text-stone-500 mt-1.5 leading-relaxed max-w-[280px]">
                    계획을 실행으로 옮기기 위한 첫 단계입니다.<br />
                    할 일 체크리스트 템플릿을 날인하여 구체적인 항목을 배치하세요.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onApplyTasksTemplate}
                  className="mt-2 px-4 py-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-100 font-sans font-medium text-xs transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4 text-amber-300" />
                  <span>할 일 체크리스트 템플릿 적용</span>
                </button>
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
                  좌측 페이지에서 할 일 템플릿을 적용해 시작하세요.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono text-stone-400">
              <span>ALEPH-06 BLANK</span>
              <span>{rightPageStr}</span>
            </div>
          </div>
        </>
      )}

      {/* ---------------- 3. 할 일 스프레드 (Tasks Spread) ---------------- */}
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
                    섹션 2: 할 일 (Tasks)
                  </span>
                </div>
                <span className="font-mono text-[11px] text-stone-400">{leftPageStr}</span>
              </div>

              <div className="mt-3 flex items-center justify-between pb-2 border-b border-stone-300">
                <span className="font-sans text-xs font-bold text-stone-800">체크리스트 템플릿</span>
                <span className="font-mono text-[10px] text-stone-400">{tasks.length} TASKS</span>
              </div>

              {/* 할 일 목록 */}
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
                <span>이전 장 (계획)</span>
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

              <div className="mt-4 h-[400px] overflow-hidden space-y-2">
                {tasksRight.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400 border border-dashed border-stone-200 rounded-lg bg-stone-50/40">
                    <Sparkles className="w-8 h-8 text-stone-300 mb-2 stroke-1" />
                    <p className="font-handwriting text-lg text-stone-500">
                      "할 일이 많아지면
                      <br />
                      우측 페이지까지 자연스럽게 채워집니다."
                    </p>
                    <p className="font-sans text-[11px] text-stone-400 mt-2">
                      체크 완료된 항목은 다음 속지(실행 일지)에 자동 기록됩니다.
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

            {/* 우측 하단: 실행 일지로 새 장 넘김 버튼 (완료된 할 일이 있을 때만 활성화) */}
            <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
              <span className="font-mono text-[10px] text-stone-400">{rightPageStr}</span>
              {hasCompletedTasks ? (
                <button
                  type="button"
                  onClick={() => onNavigateSpread(safeSpreadIndex + 1)}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-stone-100 font-sans font-medium text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                  title="다음 새로운 속지로 넘어가 실행 일지 확인"
                >
                  <span>새 장 넘겨 실행 일지</span>
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

      {/* ---------------- 4. 실행 일지 스프레드 (Logs Spread) ---------------- */}
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
                    섹션 3: 실행 일지 (Logs)
                  </span>
                </div>
                <span className="font-mono text-[11px] text-stone-400">{leftPageStr}</span>
              </div>

              <div className="mt-3 flex items-center justify-between pb-2 border-b border-stone-300">
                <span className="font-sans text-xs font-bold text-stone-800">실행 발자취 (Execution Log)</span>
                <span className="font-mono text-[10px] text-stone-400">{logs.length} RECORDS</span>
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
                <span>이전 장 (할 일)</span>
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

            <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono text-stone-400">
              <span>ALEPH-06 LOGS</span>
              <span>{rightPageStr}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
