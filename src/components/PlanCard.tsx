import React, { useState } from 'react';
import { Plan, Priority, PlanInput } from '../types/plan';
import { planService } from '../services/planService';
import {
  Calendar,
  Clock,
  Pencil,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Undo2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface PlanCardProps {
  plan: Plan;
  onPlanUpdated: (updatedPlan: Plan) => void;
}

const CRITERIA_PER_PAGE = 5;

export const PlanCard: React.FC<PlanCardProps> = ({ plan, onPlanUpdated }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  // 무스크롤 페이지네이션 상태 (책 메타포: 5개 단위 쪽 넘김)
  const [readPage, setReadPage] = useState(1);
  const [editPage, setEditPage] = useState(1);

  // 인라인 수정 폼 상태
  const [editTitle, setEditTitle] = useState(plan.title);
  const [editPriority, setEditPriority] = useState<Priority>(plan.priority);
  const [editStart, setEditStart] = useState(plan.period.start);
  const [editEnd, setEditEnd] = useState(plan.period.end);
  const [editEstimatedHours, setEditEstimatedHours] = useState(plan.estimatedHours);
  const [editCriteria, setEditCriteria] = useState<string[]>([...plan.criteria]);
  const [newCriterionInput, setNewCriterionInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 수정 모드 진입 시 현재 plan 값으로 동기화
  const handleStartEditing = () => {
    setEditTitle(plan.title);
    setEditPriority(plan.priority);
    setEditStart(plan.period.start);
    setEditEnd(plan.period.end);
    setEditEstimatedHours(plan.estimatedHours);
    setEditCriteria([...plan.criteria]);
    setNewCriterionInput('');
    setFormError(null);
    setEditPage(1);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setIsEditing(false);
    setFormError(null);
  };

  const handleToggleCheck = (index: number) => {
    setCheckedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleAddCriterion = () => {
    const trimmed = newCriterionInput.trim();
    if (!trimmed) return;
    const updated = [...editCriteria, trimmed];
    setEditCriteria(updated);
    setNewCriterionInput('');
    // 새 항목 추가 시 해당 항목이 속한 페이지로 이동
    const targetPage = Math.ceil(updated.length / CRITERIA_PER_PAGE);
    setEditPage(targetPage);
  };

  const handleRemoveCriterion = (index: number) => {
    const updated = editCriteria.filter((_, idx) => idx !== index);
    setEditCriteria(updated);
    const maxPage = Math.max(1, Math.ceil(updated.length / CRITERIA_PER_PAGE));
    if (editPage > maxPage) {
      setEditPage(maxPage);
    }
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      setFormError('계획 제목을 입력해주세요.');
      return;
    }
    if (!editStart.trim() || !editEnd.trim()) {
      setFormError('계획 기간(시작일, 종료일)을 입력해주세요.');
      return;
    }
    if (editEstimatedHours <= 0) {
      setFormError('예상 시간은 1시간 이상이어야 합니다.');
      return;
    }

    try {
      setIsSaving(true);
      setFormError(null);

      const updates: Partial<PlanInput> = {
        title: editTitle.trim(),
        priority: editPriority,
        period: {
          start: editStart.trim(),
          end: editEnd.trim(),
        },
        estimatedHours: editEstimatedHours,
        criteria: editCriteria.filter((c) => c.trim().length > 0),
      };

      const result = await planService.updatePlan(plan.id, updates);
      onPlanUpdated(result.plan);
      setIsEditing(false);
      setReadPage(1);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : '수정 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // 우선순위 레이블 및 스타일 매핑
  const priorityConfig = {
    high: {
      label: '높음',
      badgeClass: 'bg-red-50 text-red-700 border-red-200',
    },
    medium: {
      label: '보통',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    low: {
      label: '낮음',
      badgeClass: 'bg-stone-100 text-stone-600 border-stone-200',
    },
  }[plan.priority];

  const estimatedMinutes = plan.estimatedHours * 60;

  // 읽기 모드 페이지 분할
  const totalReadPages = Math.max(1, Math.ceil(plan.criteria.length / CRITERIA_PER_PAGE));
  const readStartIndex = (readPage - 1) * CRITERIA_PER_PAGE;
  const currentReadCriteria = plan.criteria.slice(
    readStartIndex,
    readStartIndex + CRITERIA_PER_PAGE
  );

  // 편집 모드 페이지 분할
  const totalEditPages = Math.max(1, Math.ceil(editCriteria.length / CRITERIA_PER_PAGE));
  const editStartIndex = (editPage - 1) * CRITERIA_PER_PAGE;
  const currentEditCriteria = editCriteria.slice(
    editStartIndex,
    editStartIndex + CRITERIA_PER_PAGE
  );

  return (
    <div className="relative flex flex-col justify-between h-full">
      {!isEditing ? (
        /* ========================================================================= */
        /* [읽기 모드] 줄노트 위 계획 카드 (5건 무스크롤 페이징) */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* 상단 메타 바 */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-200">
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] tracking-normal text-stone-500 font-semibold">
                  PLAN VIEW
                </span>
                <span
                  className={`font-sans text-[11px] px-2 py-0.5 rounded-full border font-medium ${priorityConfig.badgeClass}`}
                >
                  {priorityConfig.label}
                </span>
              </div>
              <h1 className="font-handwriting text-2xl font-bold text-stone-900 tracking-tight leading-snug break-words">
                {plan.title}
              </h1>
            </div>

            {/* 인라인 수정 모드 전환 버튼 */}
            <button
              type="button"
              onClick={handleStartEditing}
              className="flex-shrink-0 px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-700 font-sans font-medium text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="줄노트 위에서 직접 수정하기"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>계획 수정</span>
            </button>
          </div>

          {/* 기간 및 예상 시간 표시 바 */}
          <div className="grid grid-cols-2 gap-2 p-2.5 rounded bg-white/70 border border-stone-200">
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-sans text-[10px] text-stone-400">계획 기간</div>
                <div className="font-mono text-xs text-stone-700 font-medium truncate">
                  {plan.period.start} ~ {plan.period.end}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 border-l border-stone-200 pl-3">
              <Clock className="w-3.5 h-3.5 text-stone-500 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-sans text-[10px] text-stone-400">예상 총 시간</div>
                <div className="text-xs text-stone-700 font-medium font-sans">
                  <span className="font-mono">{plan.estimatedHours}</span>
                  <span>시간 (</span>
                  <span className="font-mono">{estimatedMinutes.toLocaleString()}</span>
                  <span>분)</span>
                </div>
              </div>
            </div>
          </div>

          {/* 줄노트 성공 기준 리스트 */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-sans text-xs font-semibold text-stone-700">
                성공 기준 (Success Criteria)
              </span>
              <span className="font-mono text-[11px] text-stone-400">
                {plan.criteria.length} CRITERIA
              </span>
            </div>

            {/* 줄노트 가로선 배경 컨테이너 (h-[240px], 스크롤 완전 배제, 5건 단위 페이징) */}
            <div className="h-[240px] rounded border border-stone-200 bg-white/60 bg-ruled-lines p-3 overflow-hidden select-none flex flex-col justify-between">
              {plan.criteria.length === 0 ? (
                <div className="h-full flex items-center justify-center font-sans text-xs text-stone-400">
                  등록된 성공 기준이 없습니다.
                </div>
              ) : (
                <>
                  <ul className="space-y-0 flex-1">
                    {currentReadCriteria.map((criterion, idx) => {
                      const absoluteIndex = readStartIndex + idx;
                      const isChecked = !!checkedItems[absoluteIndex];
                      return (
                        <li
                          key={absoluteIndex}
                          className="h-8 flex items-center gap-2.5 px-1 text-stone-800 select-none cursor-pointer group"
                          onClick={() => handleToggleCheck(absoluteIndex)}
                        >
                          <button
                            type="button"
                            className="flex-shrink-0 text-stone-400 group-hover:text-stone-700 transition-colors"
                            aria-label="체크박스 토글"
                          >
                            {isChecked ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-stone-400" />
                            )}
                          </button>
                          <span
                            className={`truncate transition-colors text-base tracking-wide font-handwriting ${
                              isChecked ? 'line-through text-stone-400' : 'text-stone-800'
                            }`}
                          >
                            {criterion}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  {/* 책 메타포: 5개 초과 시 페이지 넘김 컨트롤 */}
                  {totalReadPages > 1 && (
                    <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 font-sans text-[11px] text-stone-500">
                      <button
                        type="button"
                        onClick={() => setReadPage((p) => Math.max(1, p - 1))}
                        disabled={readPage === 1}
                        className="px-2 py-0.5 rounded hover:bg-stone-100 disabled:opacity-30 cursor-pointer flex items-center gap-1 transition-colors"
                      >
                        <ChevronLeft className="w-3 h-3" />
                        <span>이전 쪽</span>
                      </button>
                      <span className="font-mono text-[10px] text-stone-400">
                        {readPage} / {totalReadPages} 쪽
                      </span>
                      <button
                        type="button"
                        onClick={() => setReadPage((p) => Math.min(totalReadPages, p + 1))}
                        disabled={readPage === totalReadPages}
                        className="px-2 py-0.5 rounded hover:bg-stone-100 disabled:opacity-30 cursor-pointer flex items-center gap-1 transition-colors"
                      >
                        <span>다음 쪽</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* [인라인 편집 모드] 팝업 모달 없이 줄노트 위 직접 작성 (무스크롤 5건 페이징) */
        /* ========================================================================= */
        <form onSubmit={handleSavePlan} className="space-y-3">
          {/* 상단 편집 헤더 및 액션 버튼 */}
          <div className="flex items-center justify-between pb-2 border-b border-stone-300">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] tracking-normal text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                INLINE EDITING
              </span>
              <span className="font-sans text-xs text-stone-500">줄노트 위에서 직접 수정</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCancelEditing}
                disabled={isSaving}
                className="px-2.5 py-1 rounded border border-stone-300 text-stone-600 font-sans text-xs hover:bg-stone-100 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Undo2 className="w-3 h-3" />
                <span>취소</span>
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-3 py-1 rounded bg-stone-800 text-white font-sans text-xs font-medium hover:bg-stone-900 transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isSaving ? (
                  <span>저장 중...</span>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>저장</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {formError && (
            <div className="p-2 rounded bg-red-50 border border-red-200 text-red-700 font-sans text-xs flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* 제목 인라인 손글씨 입력 필드 */}
          <div className="space-y-1">
            <label className="font-sans text-[11px] font-semibold text-stone-600">
              계획 제목 (손글씨 필기)
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-2 py-1 font-handwriting text-2xl text-stone-900 bg-transparent border-b-2 border-stone-400 focus:border-stone-800 outline-none transition-colors"
              placeholder="계획 목표를 손글씨로 적어주세요"
              required
            />
          </div>

          {/* 우선순위 / 기간 / 시간 인라인 3분할 컨트롤 */}
          <div className="grid grid-cols-3 gap-2 p-2 rounded bg-stone-50 border border-stone-200 text-xs">
            <div className="space-y-1">
              <label className="font-sans text-[10px] text-stone-500 font-medium">우선순위</label>
              <select
                value={editPriority}
                onChange={(e) => setEditPriority(e.target.value as Priority)}
                className="w-full px-1.5 py-1 text-xs font-sans rounded border border-stone-300 bg-white outline-none focus:border-stone-500"
              >
                <option value="high">높음 (High)</option>
                <option value="medium">보통 (Medium)</option>
                <option value="low">낮음 (Low)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-sans text-[10px] text-stone-500 font-medium">예상 시간 (h)</label>
              <input
                type="number"
                min="1"
                value={editEstimatedHours}
                onChange={(e) => setEditEstimatedHours(Number(e.target.value))}
                className="w-full px-1.5 py-1 text-xs font-mono rounded border border-stone-300 bg-white outline-none focus:border-stone-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-sans text-[10px] text-stone-500 font-medium">종료일</label>
              <input
                type="text"
                value={editEnd}
                onChange={(e) => setEditEnd(e.target.value)}
                placeholder="YYYY.MM.DD"
                className="w-full px-1.5 py-1 text-xs font-mono rounded border border-stone-300 bg-white outline-none focus:border-stone-500"
                required
              />
            </div>
          </div>

          {/* 줄노트 위 성공 기준 인라인 수정 (5건 무스크롤 페이징) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-sans text-xs font-semibold text-stone-700">
                성공 기준 줄노트 편집
              </span>
              <span className="font-mono text-[10px] text-stone-400">
                {editCriteria.length} ITEMS {totalEditPages > 1 ? `(${editPage}/${totalEditPages} 쪽)` : ''}
              </span>
            </div>

            {/* 줄노트 배경 인라인 편집 목록 (h-[210px], 스크롤 완전 배제) */}
            <div className="h-[210px] rounded border border-stone-200 bg-white/70 bg-ruled-lines p-2.5 overflow-hidden flex flex-col justify-between">
              <div className="space-y-0.5 flex-1">
                {currentEditCriteria.map((c, idx) => {
                  const absoluteIndex = editStartIndex + idx;
                  return (
                    <div key={absoluteIndex} className="h-7 flex items-center gap-1.5 px-1 group">
                      <span className="font-mono text-[10px] text-stone-400 w-4 text-center">
                        {absoluteIndex + 1}
                      </span>
                      <input
                        type="text"
                        value={c}
                        onChange={(e) => {
                          const updated = [...editCriteria];
                          updated[absoluteIndex] = e.target.value;
                          setEditCriteria(updated);
                        }}
                        className="flex-1 bg-transparent px-1 py-0.5 font-handwriting text-base text-stone-800 border-b border-transparent focus:border-stone-400 outline-none"
                        placeholder="성공 기준 서술"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCriterion(absoluteIndex)}
                        className="p-1 text-stone-300 hover:text-red-500 transition-colors cursor-pointer"
                        title="항목 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}

                {/* 새 항목 추가 행 */}
                <div className="h-7 flex items-center gap-1.5 px-1 pt-1 border-t border-stone-200/60">
                  <Plus className="w-3.5 h-3.5 text-stone-400 ml-0.5 flex-shrink-0" />
                  <input
                    type="text"
                    value={newCriterionInput}
                    onChange={(e) => setNewCriterionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCriterion();
                      }
                    }}
                    placeholder="새 기준 입력 후 Enter 또는 추가"
                    className="flex-1 bg-transparent px-1 py-0.5 font-handwriting text-base text-stone-700 border-b border-stone-300 focus:border-stone-600 outline-none placeholder:font-sans placeholder:text-xs placeholder:text-stone-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddCriterion}
                    className="px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-sans text-[11px] border border-stone-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>추가</span>
                  </button>
                </div>
              </div>

              {/* 편집 모드 페이지 넘김 바 */}
              {totalEditPages > 1 && (
                <div className="flex items-center justify-between pt-1 border-t border-stone-200/60 font-sans text-[10px] text-stone-500">
                  <button
                    type="button"
                    onClick={() => setEditPage((p) => Math.max(1, p - 1))}
                    disabled={editPage === 1}
                    className="px-2 py-0.5 rounded hover:bg-stone-100 disabled:opacity-30 cursor-pointer flex items-center gap-1 transition-colors"
                  >
                    <ChevronLeft className="w-3 h-3" />
                    <span>이전 쪽</span>
                  </button>
                  <span className="font-mono text-stone-400">
                    {editPage} / {totalEditPages} 쪽
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditPage((p) => Math.min(totalEditPages, p + 1))}
                    disabled={editPage === totalEditPages}
                    className="px-2 py-0.5 rounded hover:bg-stone-100 disabled:opacity-30 cursor-pointer flex items-center gap-1 transition-colors"
                  >
                    <span>다음 쪽</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
