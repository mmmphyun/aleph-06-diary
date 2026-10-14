import React, { useState, useMemo } from 'react';
import {
  PlanPackage,
  TaskItem,
  TaskInputDto,
  TaskPriority,
  TaskStatus,
  LogItem,
  TextRevision,
} from '../types/binder';
import { PlanSpreadView } from './PlanSpreadView';
import { queryTasks } from '../utils/taskFilterSort';
import {
  getTodayKST,
  getDefaultDueDateKST,
  calculateActualMinutes,
  formatActualMinutes,
} from '../utils/dateUtils';
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
  Search,
  Edit2,
  X,
  SlidersHorizontal,
} from 'lucide-react';

interface WritingCanvasProps {
  currentPackage: PlanPackage;
  currentSpread: number;
  onNavigateSpread: (spreadIndex: number) => void;
  onNavigateToTitlePage?: () => void;
  onUpdatePlan: (title: string, content: string) => void;
  onAddRevision: (rev: TextRevision) => void;
  onAddTask: (input: string | TaskInputDto) => void;
  onUpdateTask?: (taskId: string, updates: Partial<TaskInputDto>) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleTask: (taskId: string, comment?: string, impediment?: string) => void;
  onUpdateLogComment: (logId: string, comment: string) => void;
  onUpdateLog?: (logId: string, updates: { comment?: string; impediment?: string }) => void;
  onApplyTasksTemplate: () => void;
  onConfirmPlan?: () => void;
  onTrashPlan?: (pkgId: string) => void;
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
  onUpdateTask,
  onDeleteTask,
  onToggleTask,
  onUpdateLogComment,
  onUpdateLog,
  onApplyTasksTemplate,
  onConfirmPlan,
  onTrashPlan,
  onAppendNewPlanPackage,
  chapterNumber = 1,
}) => {
  const [newTaskInput, setNewTaskInput] = useState('');

  // M3: 탐색 필터 및 검색 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all');
  const [filterDueDate, setFilterDueDate] = useState('');
  const [showFilterBar, setShowFilterBar] = useState(false);

  // M3: 할 일 상세 / 생성 / 수정 모달 상태
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [selectedTaskForEdit, setSelectedTaskForEdit] = useState<TaskItem | null>(null);

  // 모달 폼 필드 상태
  const [formTitle, setFormTitle] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formPriority, setFormPriority] = useState<TaskPriority>('medium');
  const [formStatus, setFormStatus] = useState<TaskStatus>('todo');
  const [formDescription, setFormDescription] = useState('');
  const [formTagsStr, setFormTagsStr] = useState('');
  const [formEstimatedMinutes, setFormEstimatedMinutes] = useState<number>(60);

  const { title: planTitle, content: planContent, revisions, tasks, logs, planStatus = 'draft' } = currentPackage;

  // M6: 휴지통 항목(trashStatus === 1) 제외한 활성 할 일 및 실행 일지
  const activeTasks = useMemo(() => tasks.filter((t) => t.trashStatus !== 1), [tasks]);
  const activeLogs = useMemo(() => logs.filter((l) => l.trashStatus !== 1), [logs]);

  // M3: 4차 결정적 정렬 및 AND 복합 필터가 적용된 할 일 목록 계산
  const processedTasks = useMemo(() => {
    return queryTasks(activeTasks, {
      searchQuery,
      status: filterStatus,
      priority: filterPriority,
      dueDate: filterDueDate,
    });
  }, [activeTasks, searchQuery, filterStatus, filterPriority, filterDueDate]);

  // 1. 계획 본문 줄 분할 (14줄 단위 스프레드 분할)
  const contentLines = planContent.split('\n').filter(Boolean);
  const planSpreadCount = Math.max(1, Math.ceil(contentLines.length / 14));

  // 2. 동적 속지 스택(Dynamic Leaf Stack) 구성
  const spreads: DynamicSpread[] = [];
  for (let i = 0; i < planSpreadCount; i++) {
    spreads.push({ kind: 'plan', planIndex: i, lineOffset: i * 14 });
  }

  // 3. 할 일 템플릿 적용 여부에 따라 백지 속지 또는 다중 할 일 속지 추가 (14개 단위 자동 연장)
  const isTasksApplied = Boolean(currentPackage.tasksTemplateApplied || activeTasks.length > 0);
  const activeTaskList = showFilterBar || searchQuery ? processedTasks : activeTasks;
  const tasksSpreadCount = isTasksApplied ? Math.max(1, Math.ceil(Math.max(1, activeTaskList.length) / 14)) : 0;

  if (isTasksApplied) {
    for (let j = 0; j < tasksSpreadCount; j++) {
      spreads.push({ kind: 'tasks', tasksIndex: j, itemOffset: j * 14 });
    }
  } else {
    spreads.push({ kind: 'blank' });
  }

  // 4. 할 일이 1개 이상 완료되었거나 실행 로그가 있으면 실행 일지 속지 자동 활성화 (14개 단위 자동 연장)
  const hasCompletedTasks = activeTasks.some((t) => t.done) || activeLogs.length > 0;
  const logsSpreadCount = hasCompletedTasks && isTasksApplied ? Math.max(1, Math.ceil(Math.max(1, activeLogs.length) / 14)) : 0;

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

  // 신규 할 일 생성 모달 오픈
  const handleOpenCreateModal = () => {
    const today = getTodayKST();
    const defaultDue = getDefaultDueDateKST(today);
    setFormTitle(newTaskInput.trim());
    setFormStartDate(today);
    setFormDueDate(defaultDue);
    setFormPriority('medium');
    setFormStatus('todo');
    setFormDescription('');
    setFormTagsStr('');
    setFormEstimatedMinutes(60);
    setModalMode('create');
  };

  // 기존 할 일 편집 모달 오픈
  const handleOpenEditModal = (task: TaskItem) => {
    setSelectedTaskForEdit(task);
    setFormTitle(task.title);
    setFormStartDate(task.startDate);
    setFormDueDate(task.dueDate);
    setFormPriority(task.priority);
    setFormStatus(task.status);
    setFormDescription(task.description || '');
    setFormTagsStr(task.tags.join(', '));
    setFormEstimatedMinutes(task.estimatedMinutes ?? 60);
    setModalMode('edit');
  };

  // 모달 저장 처리
  const handleSaveModal = () => {
    const trimmedTitle = formTitle.trim();
    if (!trimmedTitle) return;

    const parsedTags = formTagsStr
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (modalMode === 'create') {
      onAddTask({
        title: trimmedTitle,
        startDate: formStartDate || getTodayKST(),
        dueDate: formDueDate || getDefaultDueDateKST(formStartDate || getTodayKST()),
        priority: formPriority,
        status: formStatus,
        description: formDescription.trim(),
        tags: parsedTags,
        estimatedMinutes: formEstimatedMinutes,
      });
      setNewTaskInput('');
    } else if (modalMode === 'edit' && selectedTaskForEdit && onUpdateTask) {
      onUpdateTask(selectedTaskForEdit.id, {
        title: trimmedTitle,
        startDate: formStartDate,
        dueDate: formDueDate,
        priority: formPriority,
        status: formStatus,
        description: formDescription.trim(),
        tags: parsedTags,
        estimatedMinutes: formEstimatedMinutes,
      });
    }

    setModalMode(null);
    setSelectedTaskForEdit(null);
  };

  // 인라인 간편 추가 (기본값 기계적 적용: 오늘 시작, 7일 뒤 23:30 마감)
  const handleQuickAddTask = () => {
    const trimmed = newTaskInput.trim();
    if (!trimmed) return;
    const today = getTodayKST();
    onAddTask({
      title: trimmed,
      startDate: today,
      dueDate: getDefaultDueDateKST(today),
      priority: 'medium',
      status: 'todo',
      description: '',
      tags: [],
      estimatedMinutes: 60,
    });
    setNewTaskInput('');
  };

  // 한 면당 7개 기준 분할 (현재 할 일 스프레드 기준 - 검색/필터 적용 리스트 반영)
  const currentTasksChunk =
    activeSpread.kind === 'tasks'
      ? activeTaskList.slice(activeSpread.itemOffset, activeSpread.itemOffset + 14)
      : [];
  const tasksLeft = currentTasksChunk.slice(0, 7);
  const tasksRight = currentTasksChunk.slice(7);

  // 한 면당 7개 기준 분할 (현재 실행 일지 스프레드 기준 - 휴지통 제외)
  const currentLogsChunk =
    activeSpread.kind === 'logs' ? activeLogs.slice(activeSpread.itemOffset, activeSpread.itemOffset + 14) : [];
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
          onTrashPlan={onTrashPlan ? () => onTrashPlan(currentPackage.id) : undefined}
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
            className="w-[480px] h-full p-8 flex flex-col justify-between border-r border-stone-200"
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
                    className="mt-2 px-4 py-2.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-100 font-sans font-medium text-xs transition-colors shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4 text-amber-300" />
                    <span>할 일 체크리스트 템플릿 날인</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNavigateSpread(safeSpreadIndex - 1)}
                    className="mt-2 px-4 py-2 rounded-lg bg-stone-200 hover:bg-stone-300 text-stone-700 font-sans font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
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
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-stone-100 font-sans font-medium text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
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
            className="w-[480px] h-full p-8 flex flex-col justify-between border-r border-stone-200 relative"
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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFilterBar(!showFilterBar)}
                    className={`px-2 py-0.5 rounded text-[10px] font-sans flex items-center gap-1 border transition-colors cursor-pointer ${
                      showFilterBar || searchQuery || filterStatus !== 'all' || filterPriority !== 'all' || filterDueDate
                        ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
                        : 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                    }`}
                    title="할 일 검색·필터 인덱스 메모지 토글"
                  >
                    <SlidersHorizontal className="w-2.5 h-2.5" />
                    <span>탐색 인덱스</span>
                  </button>
                  <span className="font-mono text-[11px] text-stone-400">{leftPageStr}</span>
                </div>
              </div>

              {/* M3: 상단 부착 인덱스 메모지 (검색 · AND 복합 필터 · 4차 정렬 안내) */}
              {showFilterBar && (
                <div className="mt-2.5 p-3 rounded-lg bg-amber-50/90 border border-amber-200 shadow-xs space-y-2 text-stone-800 backdrop-blur-2xs">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-1.5 bg-white px-2 py-1 rounded border border-amber-300 text-xs">
                      <Search className="w-3.5 h-3.5 text-stone-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="제목 또는 설명 검색..."
                        className="w-full bg-transparent outline-none font-sans text-xs placeholder:text-stone-400"
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="text-stone-400 hover:text-stone-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                    {/* 상태 필터 */}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-stone-500 font-medium">상태</span>
                      <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as any)}
                        className="bg-white border border-stone-200 rounded px-1.5 py-1 text-xs outline-none"
                      >
                        <option value="all">전체 상태</option>
                        <option value="todo">진행 전 (todo)</option>
                        <option value="in_progress">진행 중 (in_progress)</option>
                        <option value="done">완료 (done)</option>
                      </select>
                    </div>

                    {/* 우선순위 필터 */}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-stone-500 font-medium">우선순위</span>
                      <select
                        value={filterPriority}
                        onChange={(e) => setFilterPriority(e.target.value as any)}
                        className="bg-white border border-stone-200 rounded px-1.5 py-1 text-xs outline-none"
                      >
                        <option value="all">전체 우선순위</option>
                        <option value="high">높음 (high)</option>
                        <option value="medium">보통 (medium)</option>
                        <option value="low">낮음 (low)</option>
                      </select>
                    </div>

                    {/* 마감일 필터 */}
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-stone-500 font-medium">마감일</span>
                      <input
                        type="date"
                        value={filterDueDate}
                        onChange={(e) => setFilterDueDate(e.target.value)}
                        className="bg-white border border-stone-200 rounded px-1 py-0.5 text-[11px] outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-1 border-t border-amber-200/60 flex items-center justify-between text-[10px] text-stone-500">
                    <span className="font-mono">정렬: 마감일↑ → 우선순위↑ → 제목순 → ID↑ (4차)</span>
                    {(searchQuery || filterStatus !== 'all' || filterPriority !== 'all' || filterDueDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setFilterStatus('all');
                          setFilterPriority('all');
                          setFilterDueDate('');
                        }}
                        className="text-amber-800 hover:underline font-semibold cursor-pointer"
                      >
                        초기화
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-2.5 flex items-center justify-between pb-2 border-b border-stone-300">
                <span className="font-sans text-xs font-bold text-stone-800">
                  체크리스트 ({activeSpread.tasksIndex * 14 + 1}~{Math.min(activeTaskList.length, (activeSpread.tasksIndex + 1) * 14)})
                </span>
                <span className="font-mono text-[10px] text-stone-400">
                  {activeTaskList.length} / {activeTasks.length} TASKS
                </span>
              </div>

              {/* 할 일 좌측 7개 목록 */}
              <div className="mt-2 h-[350px] overflow-hidden space-y-1.5">
                {tasksLeft.map((task: TaskItem) => {
                  const statusStickerClass =
                    task.status === 'done'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : task.status === 'in_progress'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-stone-100 text-stone-700 border-stone-300';

                  const priorityBadgeClass =
                    task.priority === 'high'
                      ? 'text-red-700 bg-red-50 border-red-200'
                      : task.priority === 'medium'
                      ? 'text-amber-700 bg-amber-50 border-amber-200'
                      : 'text-stone-600 bg-stone-50 border-stone-200';

                  return (
                    <div
                      key={task.id}
                      className="min-h-10 py-1.5 px-2 rounded hover:bg-stone-50/80 transition-colors group cursor-pointer border-b border-stone-200/60 flex items-center justify-between gap-2"
                      onClick={() => onToggleTask(task.id)}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {task.done ? (
                          <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-stone-400 flex-shrink-0" />
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-handwriting text-base leading-tight truncate ${
                                task.done ? 'line-through text-stone-400' : 'text-stone-900'
                              }`}
                            >
                              {task.title}
                            </span>

                            {/* 상태 스티커 */}
                            <span
                              className={`text-[9px] font-sans px-1.5 py-0.2 rounded border flex-shrink-0 ${statusStickerClass}`}
                            >
                              {task.status === 'done'
                                ? '완료'
                                : task.status === 'in_progress'
                                ? '진행 중'
                                : '진행 전'}
                            </span>

                            {/* 우선순위 뱃지 */}
                            <span
                              className={`text-[9px] font-sans px-1 py-0.2 rounded border flex-shrink-0 ${priorityBadgeClass}`}
                            >
                              {task.priority === 'high'
                                ? '높음'
                                : task.priority === 'medium'
                                ? '보통'
                                : '낮음'}
                            </span>
                          </div>

                          {/* 마감일 및 태그 표시 */}
                          <div className="flex items-center gap-2 text-[10px] text-stone-400 font-mono mt-0.5">
                            <span>마감: {task.dueDate}</span>
                            {task.tags && task.tags.length > 0 && (
                              <span className="font-sans text-stone-500 truncate max-w-[140px]">
                                #{task.tags.join(' #')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 액션 버튼 (수정/삭제) */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(task);
                          }}
                          className="p-1 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                          title="할 일 세부 수정"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTask(task.id);
                          }}
                          className="p-1 text-stone-300 hover:text-red-500 transition-colors cursor-pointer"
                          title="할 일 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* 할 일 인라인 추가 인풋 + 상세 작성 버튼 */}
                <div className="pt-2 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-stone-400 ml-1" />
                  <input
                    type="text"
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleQuickAddTask();
                    }}
                    placeholder="+ 새 할 일 입력 (Enter 빠른 추가)"
                    className="flex-1 bg-transparent font-handwriting text-base text-stone-800 outline-none placeholder:font-sans placeholder:text-xs placeholder:text-stone-400"
                  />
                  <button
                    type="button"
                    onClick={handleQuickAddTask}
                    className="px-2 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-sans text-xs border border-stone-300 cursor-pointer"
                  >
                    추가
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenCreateModal}
                    className="px-2 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 font-sans text-xs border border-teal-300 cursor-pointer"
                    title="상세 속성(우선순위, 마감일, 설명, 태그) 지정 작성"
                  >
                    상세 작성
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
            className="w-[480px] h-full p-8 flex flex-col justify-between relative"
            style={{ backgroundColor: 'var(--color-paper)' }}
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <span className="font-mono text-xs font-semibold text-stone-700">TASKS EXTENSION</span>
                <span className="font-mono text-[11px] text-stone-400">{rightPageStr}</span>
              </div>

              {/* 할 일 우측 7개 목록 */}
              <div className="mt-4 h-[400px] overflow-hidden space-y-1.5">
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
                  tasksRight.map((task: TaskItem) => {
                    const statusStickerClass =
                      task.status === 'done'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : task.status === 'in_progress'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-stone-100 text-stone-700 border-stone-300';

                    const priorityBadgeClass =
                      task.priority === 'high'
                        ? 'text-red-700 bg-red-50 border-red-200'
                        : task.priority === 'medium'
                        ? 'text-amber-700 bg-amber-50 border-amber-200'
                        : 'text-stone-600 bg-stone-50 border-stone-200';

                    return (
                      <div
                        key={task.id}
                        className="min-h-10 py-1.5 px-2 rounded hover:bg-stone-50/80 transition-colors group cursor-pointer border-b border-stone-200/60 flex items-center justify-between gap-2"
                        onClick={() => onToggleTask(task.id)}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {task.done ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-stone-400 flex-shrink-0" />
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-handwriting text-base leading-tight truncate ${
                                  task.done ? 'line-through text-stone-400' : 'text-stone-900'
                               }`}
                              >
                                {task.title}
                              </span>

                              {/* 상태 스티커 */}
                              <span
                                className={`text-[9px] font-sans px-1.5 py-0.2 rounded border flex-shrink-0 ${statusStickerClass}`}
                              >
                                {task.status === 'done'
                                  ? '완료'
                                  : task.status === 'in_progress'
                                  ? '진행 중'
                                  : '진행 전'}
                              </span>

                              {/* 우선순위 뱃지 */}
                              <span
                                className={`text-[9px] font-sans px-1 py-0.2 rounded border flex-shrink-0 ${priorityBadgeClass}`}
                              >
                                {task.priority === 'high'
                                  ? '높음'
                                  : task.priority === 'medium'
                                  ? '보통'
                                  : '낮음'}
                              </span>
                            </div>

                            {/* 마감일 및 태그 표시 */}
                            <div className="flex items-center gap-2 text-[10px] text-stone-400 font-mono mt-0.5">
                              <span>마감: {task.dueDate}</span>
                              {task.tags && task.tags.length > 0 && (
                                <span className="font-sans text-stone-500 truncate max-w-[140px]">
                                  #{task.tags.join(' #')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 액션 버튼 (수정/삭제) */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(task);
                            }}
                            className="p-1 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                            title="할 일 세부 수정"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteTask(task.id);
                            }}
                            className="p-1 text-stone-300 hover:text-red-500 transition-colors cursor-pointer"
                            title="할 일 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
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
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-stone-100 font-sans font-medium text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <span>다음 할 일 속지 보기</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : hasCompletedTasks ? (
                <button
                  type="button"
                  onClick={() => onNavigateSpread(safeSpreadIndex + 1)}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-stone-100 font-sans font-medium text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                  title="다음 새로운 속지로 넘어가 실행 일지 확인"
                >
                  <span>새 장 넘겨 실행 일지</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : isLastSpreadInPackage && onAppendNewPlanPackage ? (
                <button
                  type="button"
                  onClick={onAppendNewPlanPackage}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-stone-100 font-sans font-medium text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
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

          {/* M3: 할 일 작성 / 수정 모달 다이얼로그 */}
          {modalMode && (
            <div
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-2xs flex items-center justify-center p-4"
              style={{ zIndex: 50 }}
              onClick={() => setModalMode(null)}
            >
              <div
                className="w-[420px] rounded-xl bg-white border border-stone-200 shadow-xl p-5 space-y-4"
                style={{ backgroundColor: 'var(--color-paper)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                  <h3 className="font-serif text-base font-bold text-stone-900">
                    {modalMode === 'create' ? '새 할 일 상세 작성' : '할 일 속성 수정'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="text-stone-400 hover:text-stone-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3 font-sans text-xs text-stone-700">
                  {/* 제목 */}
                  <div>
                    <label className="block font-medium text-stone-600 mb-1">
                      할 일 제목 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="구체적 실행 제목을 입력하세요"
                      className="w-full bg-white border border-stone-300 rounded px-2.5 py-1.5 text-xs outline-none focus:border-stone-500"
                    />
                  </div>

                  {/* 시작일 & 마감일시 */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium text-stone-600 mb-1">시작일 (KST)</label>
                      <input
                        type="date"
                        value={formStartDate}
                        onChange={(e) => setFormStartDate(e.target.value)}
                        className="w-full bg-white border border-stone-300 rounded px-2 py-1 text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-stone-600 mb-1">
                        마감일시 (필수) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formDueDate}
                        onChange={(e) => setFormDueDate(e.target.value)}
                        placeholder="YYYY-MM-DD 23:30"
                        className="w-full bg-white border border-stone-300 rounded px-2 py-1 text-xs outline-none font-mono"
                      />
                    </div>
                  </div>

                  {/* 우선순위 & 상태 */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-medium text-stone-600 mb-1">우선순위</label>
                      <select
                        value={formPriority}
                        onChange={(e) => setFormPriority(e.target.value as any)}
                        className="w-full bg-white border border-stone-300 rounded px-2 py-1 text-xs outline-none"
                      >
                        <option value="high">높음 (high)</option>
                        <option value="medium">보통 (medium)</option>
                        <option value="low">낮음 (low)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-stone-600 mb-1">상태 (스티커)</label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value as any)}
                        className="w-full bg-white border border-stone-300 rounded px-2 py-1 text-xs outline-none"
                      >
                        <option value="todo">진행 전 (todo)</option>
                        <option value="in_progress">진행 중 (in_progress)</option>
                        <option value="done">완료 (done)</option>
                      </select>
                    </div>
                  </div>

                  {/* 예상 소요 시간 (30분 단위) */}
                  <div>
                    <label className="block font-medium text-stone-600 mb-1">
                      예상 소요 시간 (30분 단위)
                    </label>
                    <select
                      value={formEstimatedMinutes}
                      onChange={(e) => setFormEstimatedMinutes(Number(e.target.value))}
                      className="w-full bg-white border border-stone-300 rounded px-2.5 py-1.5 text-xs outline-none"
                    >
                      <option value={30}>30분</option>
                      <option value={60}>1시간 (60분)</option>
                      <option value={90}>1시간 30분 (90분)</option>
                      <option value={120}>2시간 (120분)</option>
                      <option value={180}>3시간 (180분)</option>
                      <option value={240}>4시간 (240분)</option>
                    </select>
                  </div>

                  {/* 설명 */}
                  <div>
                    <label className="block font-medium text-stone-600 mb-1">설명 (선택)</label>
                    <textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="구체적인 실행 가이드나 메모를 입력하세요"
                      rows={2}
                      className="w-full bg-white border border-stone-300 rounded px-2.5 py-1.5 text-xs outline-none focus:border-stone-500 resize-none"
                    />
                  </div>

                  {/* 태그 */}
                  <div>
                    <label className="block font-medium text-stone-600 mb-1">
                      태그 (쉼표로 구분)
                    </label>
                    <input
                      type="text"
                      value={formTagsStr}
                      onChange={(e) => setFormTagsStr(e.target.value)}
                      placeholder="예: CS, 네트워크, TCP"
                      className="w-full bg-white border border-stone-300 rounded px-2.5 py-1.5 text-xs outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="px-3 py-1.5 rounded border border-stone-300 bg-stone-100 hover:bg-stone-200 text-stone-700 font-sans text-xs cursor-pointer"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveModal}
                    className="px-3 py-1.5 rounded bg-stone-900 hover:bg-stone-800 text-stone-100 font-sans text-xs font-medium cursor-pointer"
                  >
                    {modalMode === 'create' ? '할 일 추가' : '수정 완료'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ---------------- 4. 실행 일지 스프레드 (Logs Spread - 14개 단위 다중 연장) ---------------- */}
      {activeSpread.kind === 'logs' && (
        <>
          {/* 좌측 면 (Logs Left: 480×640px) */}
          <div
            className="w-[480px] h-full p-8 flex flex-col justify-between border-r border-stone-200"
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
                  logsLeft.map((log: LogItem) => {
                    const durationMins = log.actualMinutes ?? calculateActualMinutes(log.startedAt, log.endedAt);
                    const formattedDuration = formatActualMinutes(durationMins);

                    return (
                      <div
                        key={log.id}
                        className="p-3 rounded bg-white/70 border border-stone-200 space-y-1.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-stone-500 font-semibold truncate max-w-[240px]">
                            {log.completedAt}
                          </span>
                          <span className="font-sans text-[10px] text-emerald-700 font-medium flex-shrink-0">
                            ✓ 완료
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-1">
                          <div className="font-handwriting text-base text-stone-900 leading-snug truncate flex-1">
                            {log.taskTitle}
                          </div>
                          {durationMins > 0 && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex-shrink-0">
                              소요: {formattedDuration} ({durationMins}분)
                            </span>
                          )}
                        </div>

                        {/* 시작~종료 일시 및 막혔던 이유 인라인 표시 */}
                        <div className="pt-1 border-t border-stone-100 flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-sans text-[9px] text-stone-400 font-medium">소회:</span>
                            <input
                              type="text"
                              value={log.comment}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (onUpdateLog) {
                                  onUpdateLog(log.id, { comment: val });
                                } else {
                                  onUpdateLogComment(log.id, val);
                                }
                              }}
                              placeholder="한 줄 성찰 소회를 적으세요"
                              className="flex-1 bg-transparent font-handwriting text-xs text-stone-600 outline-none placeholder:font-sans placeholder:text-[10px] placeholder:text-stone-400"
                            />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="font-sans text-[9px] text-rose-500 font-medium">장애:</span>
                            <input
                              type="text"
                              value={log.impediment || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (onUpdateLog) {
                                  onUpdateLog(log.id, { impediment: val });
                                }
                              }}
                              placeholder="막혔던 이유나 방해 요인 (선택)"
                              className="flex-1 bg-transparent font-handwriting text-xs text-rose-700 outline-none placeholder:font-sans placeholder:text-[10px] placeholder:text-stone-400"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
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
                  logsRight.map((log: LogItem) => {
                    const durationMins = log.actualMinutes ?? calculateActualMinutes(log.startedAt, log.endedAt);
                    const formattedDuration = formatActualMinutes(durationMins);

                    return (
                      <div
                        key={log.id}
                        className="p-3 rounded bg-white/70 border border-stone-200 space-y-1.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] text-stone-500 truncate max-w-[240px]">
                            {log.completedAt}
                          </span>
                          <span className="font-sans text-[10px] text-emerald-700 flex-shrink-0">✓ 완료</span>
                        </div>

                        <div className="flex items-center justify-between gap-1">
                          <div className="font-handwriting text-base text-stone-900 truncate flex-1">
                            {log.taskTitle}
                          </div>
                          {durationMins > 0 && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 flex-shrink-0">
                              소요: {formattedDuration} ({durationMins}분)
                            </span>
                          )}
                        </div>

                        {/* 시작~종료 일시 및 막혔던 이유 인라인 표시 */}
                        <div className="pt-1 border-t border-stone-100 flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-sans text-[9px] text-stone-400 font-medium">소회:</span>
                            <input
                              type="text"
                              value={log.comment}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (onUpdateLog) {
                                  onUpdateLog(log.id, { comment: val });
                                } else {
                                  onUpdateLogComment(log.id, val);
                                }
                              }}
                              placeholder="한 줄 소회 기록"
                              className="flex-1 bg-transparent font-handwriting text-xs text-stone-600 outline-none"
                            />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="font-sans text-[9px] text-rose-500 font-medium">장애:</span>
                            <input
                              type="text"
                              value={log.impediment || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (onUpdateLog) {
                                  onUpdateLog(log.id, { impediment: val });
                                }
                              }}
                              placeholder="막혔던 이유나 방해 요인 (선택)"
                              className="flex-1 bg-transparent font-handwriting text-xs text-rose-700 outline-none"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
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
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-stone-100 font-sans font-medium text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <span>다음 일지 속지 보기</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : isLastSpreadInPackage && onAppendNewPlanPackage ? (
                <button
                  type="button"
                  onClick={onAppendNewPlanPackage}
                  className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-stone-100 font-sans font-medium text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
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
