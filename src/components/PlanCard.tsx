import React, { useState } from 'react';
import { Plan, Priority, PlanInput } from '../types/plan';
import { planService } from '../services/planService';
import {
  Calendar,
  Clock,
  Pencil,
  CheckSquare,
  Square,
  X,
  Plus,
  Trash2,
  Check,
  AlertCircle,
} from 'lucide-react';

interface PlanCardProps {
  plan: Plan;
  onPlanUpdated: (updatedPlan: Plan) => void;
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan, onPlanUpdated }) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  // 수정 모달 폼 상태
  const [editTitle, setEditTitle] = useState(plan.title);
  const [editPriority, setEditPriority] = useState<Priority>(plan.priority);
  const [editStart, setEditStart] = useState(plan.period.start);
  const [editEnd, setEditEnd] = useState(plan.period.end);
  const [editEstimatedHours, setEditEstimatedHours] = useState(plan.estimatedHours);
  const [editCriteria, setEditCriteria] = useState<string[]>([...plan.criteria]);
  const [newCriterionInput, setNewCriterionInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 모달 열기 시 현재 plan 값으로 동기화
  const handleOpenEditModal = () => {
    setEditTitle(plan.title);
    setEditPriority(plan.priority);
    setEditStart(plan.period.start);
    setEditEnd(plan.period.end);
    setEditEstimatedHours(plan.estimatedHours);
    setEditCriteria([...plan.criteria]);
    setNewCriterionInput('');
    setFormError(null);
    setIsEditModalOpen(true);
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
    setEditCriteria((prev) => [...prev, trimmed]);
    setNewCriterionInput('');
  };

  const handleRemoveCriterion = (index: number) => {
    setEditCriteria((prev) => prev.filter((_, idx) => idx !== index));
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
      setIsEditModalOpen(false);
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

  return (
    <div className="relative flex flex-col justify-between h-full">
      <div className="space-y-4">
        {/* 상단 메타 바 */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-stone-200">
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] tracking-wider uppercase text-stone-500 font-semibold">
                PLAN VIEW
              </span>
              <span
                className={`font-sans text-[11px] px-2 py-0.5 rounded-full border font-medium ${priorityConfig.badgeClass}`}
              >
                {priorityConfig.label}
              </span>
            </div>
            <h1 className="font-sans text-lg font-bold text-stone-900 tracking-tight leading-snug break-words">
              {plan.title}
            </h1>
          </div>

          {/* 계획 수정 트리거 버튼 */}
          <button
            type="button"
            onClick={handleOpenEditModal}
            className="flex-shrink-0 px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-700 font-sans font-medium text-xs transition-colors flex items-center gap-1.5 shadow-xs"
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

          {/* 줄노트 가로선 배경 컨테이너 (h-[240px], 스크롤 배제) */}
          <div className="h-[240px] rounded border border-stone-200 bg-white/60 bg-ruled-lines p-3 overflow-hidden select-none">
            {plan.criteria.length === 0 ? (
              <div className="h-full flex items-center justify-center font-sans text-xs text-stone-400">
                등록된 성공 기준이 없습니다.
              </div>
            ) : (
              <ul className="space-y-0">
                {plan.criteria.map((criterion, idx) => {
                  const isChecked = !!checkedItems[idx];
                  return (
                    <li
                      key={idx}
                      className="h-8 flex items-center gap-2 px-1 text-stone-800 text-xs font-sans select-none cursor-pointer group"
                      onClick={() => handleToggleCheck(idx)}
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
                        className={`truncate transition-all ${
                          isChecked ? 'line-through text-stone-400' : 'text-stone-800'
                        }`}
                      >
                        {criterion}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* 계획 수정 모달 다이얼로그 */}
      {isEditModalOpen && (
        <div className="absolute inset-0 z-30 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-h-[580px] bg-white rounded-lg shadow-xl border border-stone-300 flex flex-col overflow-hidden animate-in fade-in duration-150">
            {/* 모달 헤더 */}
            <div className="px-4 py-3 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <Pencil className="w-4 h-4 text-stone-600" />
                <h2 className="font-sans text-sm font-bold text-stone-800">
                  계획 수정
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                disabled={isSaving}
                className="text-stone-400 hover:text-stone-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 모달 폼 바디 */}
            <form onSubmit={handleSavePlan} className="p-4 overflow-y-auto space-y-3.5 flex-1">
              {formError && (
                <div className="p-2.5 rounded bg-red-50 border border-red-200 text-red-700 font-sans text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 제목 입력 */}
              <div className="space-y-1">
                <label className="font-sans text-xs font-semibold text-stone-700">
                  계획 제목
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-sans rounded border border-stone-300 focus:outline-none focus:border-stone-500"
                  placeholder="계획의 명확한 목표를 입력하세요"
                  required
                />
              </div>

              {/* 우선순위 및 예상 시간 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-sans text-xs font-semibold text-stone-700">
                    우선순위
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as Priority)}
                    className="w-full px-3 py-1.5 text-xs font-sans rounded border border-stone-300 bg-white focus:outline-none focus:border-stone-500"
                  >
                    <option value="high">높음 (High)</option>
                    <option value="medium">보통 (Medium)</option>
                    <option value="low">낮음 (Low)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-sans text-xs font-semibold text-stone-700">
                    예상 시간 (시간 단위)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={editEstimatedHours}
                    onChange={(e) => setEditEstimatedHours(Number(e.target.value))}
                    className="w-full px-3 py-1.5 text-xs font-mono rounded border border-stone-300 focus:outline-none focus:border-stone-500"
                    required
                  />
                </div>
              </div>

              {/* 기간 입력 (시작일, 종료일) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-sans text-xs font-semibold text-stone-700">
                    시작일
                  </label>
                  <input
                    type="text"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                    placeholder="YYYY.MM.DD"
                    className="w-full px-3 py-1.5 text-xs font-mono rounded border border-stone-300 focus:outline-none focus:border-stone-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-sans text-xs font-semibold text-stone-700">
                    종료일
                  </label>
                  <input
                    type="text"
                    value={editEnd}
                    onChange={(e) => setEditEnd(e.target.value)}
                    placeholder="YYYY.MM.DD"
                    className="w-full px-3 py-1.5 text-xs font-mono rounded border border-stone-300 focus:outline-none focus:border-stone-500"
                    required
                  />
                </div>
              </div>

              {/* 성공 기준 편집 */}
              <div className="space-y-1.5 pt-1">
                <label className="font-sans text-xs font-semibold text-stone-700">
                  성공 기준 목록
                </label>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {editCriteria.map((c, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={c}
                        onChange={(e) => {
                          const updated = [...editCriteria];
                          updated[idx] = e.target.value;
                          setEditCriteria(updated);
                        }}
                        className="flex-1 px-2.5 py-1 text-xs font-sans rounded border border-stone-200 focus:outline-none focus:border-stone-400"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveCriterion(idx)}
                        className="p-1 text-stone-400 hover:text-red-600 rounded"
                        title="항목 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* 기준 추가 인풋 */}
                <div className="flex items-center gap-1.5 pt-1">
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
                    placeholder="새 성공 기준 입력 후 추가"
                    className="flex-1 px-2.5 py-1 text-xs font-sans rounded border border-stone-200 focus:outline-none focus:border-stone-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddCriterion}
                    className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 font-sans text-xs font-medium border border-stone-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>추가</span>
                  </button>
                </div>
              </div>

              {/* 모달 하단 버튼 */}
              <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isSaving}
                  className="px-3 py-1.5 rounded border border-stone-300 text-stone-700 font-sans font-medium text-xs hover:bg-stone-100 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-3 py-1.5 rounded bg-stone-800 text-white font-sans font-medium text-xs hover:bg-stone-900 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSaving ? (
                    <span>저장 중...</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>수정 저장</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
