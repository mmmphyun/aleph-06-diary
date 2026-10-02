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
  currentSpread: number; // 0: 계획, 1: 할 일, 2: 실행 일지
  onNavigateSpread: (spreadIndex: number) => void;
  onNavigateToTitlePage?: () => void;
  onUpdatePlan: (title: string, content: string) => void;
  onAddRevision: (rev: TextRevision) => void;
  onAddTask: (title: string) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTask: (taskId: string, comment?: string) => void;
  onUpdateLogComment: (logId: string, comment: string) => void;
}

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
}) => {
  const [newTaskInput, setNewTaskInput] = useState('');

  const { title: planTitle, content: planContent, revisions, tasks, logs } = currentPackage;
  const startPage = currentPackage.startPage || 1;

  const pageSpread1Left = `PAGE ${String(startPage + 2).padStart(2, '0')}`;
  const pageSpread1Right = `PAGE ${String(startPage + 3).padStart(2, '0')}`;
  const pageSpread2Left = `PAGE ${String(startPage + 4).padStart(2, '0')}`;
  const pageSpread2Right = `PAGE ${String(startPage + 5).padStart(2, '0')}`;

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
    <div className="relative w-full h-full flex transform-style-preserve-3d select-none">
      {/* ========================================================================= */}
      {/* [Spread 0: 계획 캔버스] 자연스러운 줄바꿈 본문 및 드래그 범위 만년필 1회 교정 */}
      {/* ========================================================================= */}
      {currentSpread === 0 && (
        <PlanSpreadView
          planTitle={planTitle}
          onUpdateTitle={(newTitle) => onUpdatePlan(newTitle, planContent)}
          planContent={planContent}
          onUpdateContent={(newContent) => onUpdatePlan(planTitle, newContent)}
          revisions={revisions}
          onAddRevision={onAddRevision}
          onNavigateNextSpread={() => onNavigateSpread(1)}
          onNavigateToTitlePage={onNavigateToTitlePage}
          startPage={startPage}
        />
      )}

      {/* ========================================================================= */}
      {/* [Spread 1: 할 일 캔버스] 새로운 빈 속지 위 체크리스트 템플릿 */}
      {/* ========================================================================= */}
      {currentSpread === 1 && (
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
                <span className="font-mono text-[11px] text-stone-400">{pageSpread1Left}</span>
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

            {/* 좌측 하단 이전 장 버튼 */}
            <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onNavigateSpread(0)}
                className="font-sans text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>이전 장 (계획)</span>
              </button>
              <span className="font-mono text-[10px] text-stone-400">{pageSpread1Left}</span>
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
                <span className="font-mono text-[11px] text-stone-400">{pageSpread1Right}</span>
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

            {/* 우측 하단: 실행 일지로 새 장 넘김 버튼 */}
            <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
              <span className="font-mono text-[10px] text-stone-400">{pageSpread1Right}</span>
              <button
                type="button"
                onClick={() => onNavigateSpread(2)}
                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-stone-100 font-sans font-medium text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                title="다음 새로운 빈 속지로 넘어가 실행 일지 확인"
              >
                <span>새 장 넘겨 실행 일지</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* [Spread 2: 실행 일지 캔버스] 할 일 완료 시 실시간 타임스탬프와 손글씨 코멘트 */}
      {/* ========================================================================= */}
      {currentSpread === 2 && (
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
                <span className="font-mono text-[11px] text-stone-400">{pageSpread2Left}</span>
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
                onClick={() => onNavigateSpread(1)}
                className="font-sans text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>이전 장 (할 일)</span>
              </button>
              <span className="font-mono text-[10px] text-stone-400">{pageSpread2Left}</span>
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
                <span className="font-mono text-[11px] text-stone-400">{pageSpread2Right}</span>
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
              <span>{pageSpread2Right}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
