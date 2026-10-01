import React, { useState, useEffect, useCallback } from 'react';
import { SpineDivider } from './SpineDivider';
import { CoverView } from './CoverView';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { PlanCard } from './PlanCard';
import { RevisionTimeline } from './RevisionTimeline';
import { DeskMemoSheet } from './DeskMemoSheet';
import { Plan } from '../types/plan';
import { planService } from '../services/planService';
import { BookMarked, RotateCw, Sparkles, RefreshCcw, BookOpen, ArrowRight } from 'lucide-react';

export type FlipPhase = 'closed' | 'cover-opened' | 'opened';

export const BinderChassis: React.FC = () => {
  // 물리 3단계: Frame 0(닫힘) -> Frame 1(표지만 열림/첫 내지 대기) -> Frame 3(본문 개방)
  const [phase, setPhase] = useState<FlipPhase>('closed');

  // M2 계획 데이터 상태
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revisionTrigger, setRevisionTrigger] = useState(0);

  const loadPlanData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await planService.getPlan();
      setPlan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '계획 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlanData();
  }, [loadPlanData]);

  // 수동 2회 클릭 인터랙션 (JS 타이머 배제, CSS transition에 위임)
  const handleOpenCover = () => setPhase('cover-opened');
  const handleFlipLeaf = () => setPhase('opened');
  const handleCloseCover = () => setPhase('closed');

  const handlePlanUpdated = (updatedPlan: Plan) => {
    setPlan(updatedPlan);
    setRevisionTrigger((prev) => prev + 1);
  };

  const handleCreateInitialPlan = async () => {
    await planService.resetMockData();
    await loadPlanData();
    setRevisionTrigger((prev) => prev + 1);
  };

  const handleClearPlan = async () => {
    await planService.clearPlan();
    setPlan(null);
  };

  const isCoverOpen = phase !== 'closed';
  const isLeafFlipped = phase === 'opened';

  return (
    <div className="relative w-[960px] h-[640px] perspective-1400">
      {/* ---------------- [Frame 0 레이어] 좌측 데스크 메모지 + 우측 닫힌 하드커버 ---------------- */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-between pointer-events-none">
        <div
          className={`w-[480px] h-[640px] flex items-center justify-center p-4 transition-opacity duration-300 ${
            phase === 'closed' ? 'opacity-100 pointer-events-auto' : 'opacity-0'
          }`}
        >
          <DeskMemoSheet />
        </div>

        <div
          className={`w-[480px] h-[640px] rounded-xl border-4 border-[#2E2A27] shadow-chassis relative transition-opacity duration-300 ${
            phase === 'closed' ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundColor: 'var(--color-cover)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          }}
        />
      </div>

      {/* ---------------- [Frame 1~3 양면 바인더 섀시 (960×640px)] ---------------- */}
      <div
        className={`absolute inset-0 w-[960px] h-[640px] rounded-xl border-4 border-[#2E2A27] shadow-chassis overflow-hidden z-10 transition-opacity duration-300 ${
          phase === 'closed' ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{
          backgroundColor: 'var(--color-cover)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div className="relative w-full h-full flex transform-style-preserve-3d">
          {/* 좌측 내지 페이지 (PlanCard) */}
          <div
            className={`w-[480px] h-full p-8 flex flex-col justify-between border-r border-[#E7E5E4] transition-opacity duration-300 ${
              phase === 'opened' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
            style={{ backgroundColor: 'var(--color-paper)' }}
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-stone-600" />
                  <span className="font-mono text-xs font-semibold tracking-wider text-stone-700">
                    PLAN-DO-SEE
                  </span>
                </div>
                <span className="font-mono text-[11px] text-stone-400">VIEW 2 / PLAN</span>
              </div>

              <div className="mt-4 h-[470px]">
                {loading ? (
                  <div className="h-full flex items-center justify-center">
                    <LoadingState />
                  </div>
                ) : error ? (
                  <div className="h-full flex items-center justify-center">
                    <ErrorState message={error} onRetry={loadPlanData} />
                  </div>
                ) : !plan ? (
                  <div className="h-full border border-stone-200 rounded-md overflow-hidden bg-white/50">
                    <EmptyState onAction={handleCreateInitialPlan} />
                  </div>
                ) : (
                  <PlanCard plan={plan} onPlanUpdated={handlePlanUpdated} />
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
              <span className="font-mono text-[10px] text-stone-400">PAGE 01</span>
              {phase === 'opened' && (
                <button
                  type="button"
                  onClick={handleCloseCover}
                  className="px-3 py-1 rounded bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-700 font-sans font-medium text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>표지 닫기</span>
                </button>
              )}
            </div>
          </div>

          {/* 중앙 제본선 */}
          <SpineDivider />

          {/* 우측 내지 페이지 (RevisionTimeline) */}
          <div
            className="w-[480px] h-full p-8 flex flex-col justify-between"
            style={{ backgroundColor: 'var(--color-paper)' }}
          >
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div className="flex items-center gap-1.5 text-xs font-sans font-medium text-stone-600">
                  <Sparkles className="w-3.5 h-3.5 text-stone-500" />
                  <span>타임라인 뷰어</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {plan ? (
                    <button
                      type="button"
                      onClick={handleClearPlan}
                      className="px-2 py-0.5 rounded text-[10px] font-sans border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-600 transition-colors cursor-pointer"
                      title="데이터 비우기 (빈 상태 테스트)"
                    >
                      빈 상태 테스트
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleCreateInitialPlan}
                      className="px-2 py-0.5 rounded text-[10px] font-sans border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-600 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Mock 데이터 복원"
                    >
                      <RefreshCcw className="w-2.5 h-2.5" />
                      <span>데이터 복원</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-4 h-[470px]">
                {!plan ? (
                  <div className="h-full flex flex-col items-center justify-center border border-dashed border-stone-300 rounded-lg p-8 text-center bg-stone-50/50">
                    <p className="font-sans text-xs text-stone-500 leading-relaxed">
                      좌측 페이지에서 첫 계획을 등록하면
                      <br />
                      이곳에 변경 사항 스냅샷과 수정 이력이
                      <br />
                      5건 단위로 기록됩니다.
                    </p>
                  </div>
                ) : (
                  <RevisionTimeline planId={plan.id} refreshTrigger={revisionTrigger} />
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono text-stone-400">
              <span>VIEW 2 (PLAN)</span>
              <span>PAGE 02</span>
            </div>
          </div>
        </div>
      </div>

      {/* ---------------- [FlipLeaf 속지 레이어 (z-25)] ---------------- */}
      {/* Frame 1에서 우측 RevisionTimeline을 가리는 LEAF 01 표제지. 클릭 2 시 -180도 회전 ---------------- */}
      <div
        className={`absolute top-0 right-0 w-[480px] h-[640px] z-25 select-none transition-transform duration-450 ease-in-out ${
          phase === 'closed' ? 'hidden' : 'block'
        } ${phase === 'cover-opened' ? 'pointer-events-auto' : 'pointer-events-none'}`}
        style={{
          transformOrigin: 'left center',
          transformStyle: 'preserve-3d',
          transform: isLeafFlipped ? 'rotateY(-180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* 속지 앞면: LEAF 01 표제지 */}
        <div
          className="absolute inset-0 w-full h-full p-8 flex flex-col justify-between border-l border-[#E7E5E4] backface-hidden shadow-xl"
          style={{
            backgroundColor: 'var(--color-paper)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <span className="font-mono text-xs font-semibold text-stone-700">PLAN-DO-SEE</span>
            <span className="font-mono text-[11px] text-stone-400">LEAF 01</span>
          </div>
          <div className="my-auto text-center space-y-4">
            <BookOpen className="w-10 h-10 text-stone-400 mx-auto stroke-1" />
            <div className="space-y-1.5">
              <div className="font-handwriting text-2xl text-stone-800">기록과 성찰의 시간</div>
              <p className="font-sans text-xs text-stone-500 leading-relaxed">
                계획을 펼치고 실행의 발자취를 이어갑니다.
              </p>
            </div>
          </div>
          <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
            <span className="text-[10px] font-mono text-stone-400">ALEPH-06 DIARY</span>
            {phase === 'cover-opened' && (
              <button
                type="button"
                onClick={handleFlipLeaf}
                className="px-3.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-900 text-stone-100 font-sans font-medium text-xs transition-all shadow-sm hover:shadow flex items-center gap-1.5 active:scale-95 cursor-pointer"
                title="다음 장으로 넘겨 본문 열기"
              >
                <span>다음 장 넘기기</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 속지 뒷면: 뒤집혔을 때 좌측에 안착하는 빈 면 */}
        <div
          className="absolute inset-0 w-full h-full p-8 flex flex-col justify-between border-r border-[#E7E5E4] backface-hidden shadow-xl"
          style={{
            backgroundColor: 'var(--color-paper)',
            transform: 'rotateY(180deg)',
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
          }}
        >
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <span className="font-mono text-xs font-semibold text-stone-700">PLAN-DO-SEE</span>
            <span className="font-mono text-[11px] text-stone-400">PAGE 01</span>
          </div>
          <div className="text-[10px] font-mono text-stone-400 text-right">PAGE 01</div>
        </div>
      </div>

      {/* ---------------- [CoverView 앞표지 레이어 (z-30)] ---------------- */}
      <CoverView
        isOpen={isCoverOpen}
        onOpen={handleOpenCover}
        onClose={handleCloseCover}
        disabled={phase === 'opened'}
      />
    </div>
  );
};
