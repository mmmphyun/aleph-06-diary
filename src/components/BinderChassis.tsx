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
import { BookMarked, RotateCw, Sparkles, RefreshCcw, Layers } from 'lucide-react';

export const BinderChassis: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // M2 계획 데이터 상태
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revisionTrigger, setRevisionTrigger] = useState(0);

  // 모드 전환: 'plan'(M2 계획 및 수정 이력) vs 'm1_demo'(M1 정적 3대 상태 뷰)
  const [activeMode, setActiveMode] = useState<'plan' | 'm1_demo'>('plan');
  const [demoState, setDemoState] = useState<'empty' | 'loading' | 'error'>('empty');

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

  const handleOpenCover = () => {
    if (isAnimating || isOpen) return;
    setIsAnimating(true);
    setIsOpen(true);
    setTimeout(() => {
      setIsAnimating(false);
    }, 700); // coverUnfold 700ms
  };

  const handleCloseCover = () => {
    if (isAnimating || !isOpen) return;
    setIsAnimating(true);
    setIsOpen(false);
    setTimeout(() => {
      setIsAnimating(false);
    }, 600); // coverFold 600ms
  };

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

  return (
    <div className="relative w-[960px] h-[640px] perspective-1400">
      {/* ========================================================================= */}
      {/* [레이어 1: 닫힘 상태 베이스] 좌측 데스크 메모지 + 우측 닫힌 단권 다이어리 (480px) */}
      {/* 표지가 닫혀 있을 때 검은색 바인더가 좌측까지 길게 늘어나는 시각 왜곡을 원천 차단 */}
      {/* ========================================================================= */}
      <div
        className={`absolute inset-0 w-full h-full flex items-center justify-between transition-opacity duration-300 ${
          isOpen && !isAnimating ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* 좌측 480px: 순수 웜스톤 데스크 위의 단독 메모지 (하드커버 테두리/배경 0%) */}
        <div className="w-[480px] h-[640px] flex items-center justify-center p-4">
          <DeskMemoSheet />
        </div>

        {/* 우측 480px: 닫힌 독립 다이어리 1권의 하드커버 베이스 */}
        <div
          className="w-[480px] h-[640px] rounded-xl border-4 border-[#2E2A27] shadow-chassis relative"
          style={{
            backgroundColor: 'var(--color-cover)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          }}
        />
      </div>

      {/* ========================================================================= */}
      {/* [레이어 2: 펼침 상태 양면 바인더 섀시 (960×640px)] 속지 및 내지 컨트롤 */}
      {/* ========================================================================= */}
      <div
        className={`absolute inset-0 w-[960px] h-[640px] rounded-xl border-4 border-[#2E2A27] shadow-chassis overflow-hidden transition-opacity duration-300 z-20 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{
          backgroundColor: 'var(--color-cover)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        }}
      >
        <div className="relative w-full h-full flex transform-style-preserve-3d">
          {/* ---------------- 좌측 내지 페이지 (Left Page: 480×640px) ---------------- */}
          <div
            className="w-[480px] h-full p-8 flex flex-col justify-between border-r border-[#E7E5E4]"
            style={{
              backgroundColor: 'var(--color-paper)',
            }}
          >
            {/* 좌측 페이지 상단 헤더 */}
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <BookMarked className="w-4 h-4 text-stone-600" />
                  <span className="font-mono text-xs font-semibold tracking-wider text-stone-700">
                    PLAN-DO-SEE
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-stone-400">
                    {activeMode === 'plan' ? 'VIEW 2 / PLAN' : 'VIEW 0 / SCAFFOLD'}
                  </span>
                  {/* 개발/검증용 모드 토글 */}
                  <button
                    type="button"
                    onClick={() => setActiveMode((m) => (m === 'plan' ? 'm1_demo' : 'plan'))}
                    className="font-sans text-[10px] px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-600 flex items-center gap-1 transition-colors"
                    title="뷰 모드 전환 (M2 계획 vs M1 정적 상태)"
                  >
                    <Layers className="w-3 h-3" />
                    <span>{activeMode === 'plan' ? 'M1 검증' : 'M2 계획'}</span>
                  </button>
                </div>
              </div>

              {/* 좌측 페이지 메인 렌더링 영역 */}
              <div className="mt-4 h-[470px]">
                {activeMode === 'm1_demo' ? (
                  /* M1 골격 검증 가이드 뷰 */
                  <div className="space-y-4">
                    <h1 className="font-handwriting text-2xl text-stone-800 leading-snug">
                      오늘의 다이어리
                    </h1>
                    <p className="font-sans text-xs text-stone-500 leading-relaxed">
                      바인더 섀시 규격(960×640px)과 2.5D 인터랙션 골격이 준비되었습니다. 우측 페이지에서 M1 3대 정적 상태 뷰를 확인하세요.
                    </p>
                    <div className="p-4 rounded bg-[#FAF9F6] border border-stone-200 text-xs font-sans space-y-2 text-stone-600">
                      <div className="font-semibold text-stone-800 border-b border-stone-200 pb-1">
                        M1 골격 검증 체크리스트
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-700 font-bold">✓</span>
                        <span>960×640px 1.5:1 고정 양장 바인더</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-700 font-bold">✓</span>
                        <span>무채색 웜스톤 데스크 (#EFECE6)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-700 font-bold">✓</span>
                        <span>3D 언폴드 (rotateY -180deg / 700ms)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-700 font-bold">✓</span>
                        <span>T06-C82 보안 공지 및 React Text Node</span>
                      </div>
                    </div>
                  </div>
                ) : loading ? (
                  /* 로딩 상태 */
                  <div className="h-full flex items-center justify-center">
                    <LoadingState />
                  </div>
                ) : error ? (
                  /* 에러 상태 */
                  <div className="h-full flex items-center justify-center">
                    <ErrorState message={error} onRetry={loadPlanData} />
                  </div>
                ) : !plan ? (
                  /* 데이터 부재 시 EmptyState 렌더링 방어 로직 */
                  <div className="h-full border border-stone-200 rounded-md overflow-hidden bg-white/50">
                    <EmptyState onAction={handleCreateInitialPlan} />
                  </div>
                ) : (
                  /* 활성 계획 카드 UI */
                  <PlanCard plan={plan} onPlanUpdated={handlePlanUpdated} />
                )}
              </div>
            </div>

            {/* 좌측 페이지 하단: 표지 닫기 */}
            <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
              <span className="font-mono text-[10px] text-stone-400">PAGE 01</span>
              {isOpen && (
                <button
                  type="button"
                  onClick={handleCloseCover}
                  disabled={isAnimating}
                  className="px-3 py-1 rounded bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-700 font-sans font-medium text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 shadow-xs"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>표지 닫기</span>
                </button>
              )}
            </div>
          </div>

          {/* ---------------- 중앙 16px 제본선 음영 ---------------- */}
          <SpineDivider />

          {/* ---------------- 우측 내지 페이지 (Right Page: 480×640px) ---------------- */}
          <div
            className="w-[480px] h-full p-8 flex flex-col justify-between"
            style={{
              backgroundColor: 'var(--color-paper)',
            }}
          >
            {/* 우측 페이지 상단 */}
            <div>
              {/* 우측 상단 유틸리티 바 */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                {activeMode === 'plan' ? (
                  <>
                    <div className="flex items-center gap-1.5 text-xs font-sans font-medium text-stone-600">
                      <Sparkles className="w-3.5 h-3.5 text-stone-500" />
                      <span>타임라인 뷰어</span>
                    </div>

                    {/* 테스트용 데이터 비우기 / 리셋 버튼 */}
                    <div className="flex items-center gap-1.5">
                      {plan ? (
                        <button
                          type="button"
                          onClick={handleClearPlan}
                          className="px-2 py-0.5 rounded text-[10px] font-sans border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-600 transition-colors"
                          title="EmptyState 방어 로직 검증용 데이터 비우기"
                        >
                          빈 상태 테스트
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleCreateInitialPlan}
                          className="px-2 py-0.5 rounded text-[10px] font-sans border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-600 flex items-center gap-1 transition-colors"
                          title="초기 Mock 데이터 복원"
                        >
                          <RefreshCcw className="w-2.5 h-2.5" />
                          <span>데이터 복원</span>
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 text-xs font-sans font-medium text-stone-500">
                      <span>M1 상태 뷰 검증</span>
                    </div>
                    {/* 3대 상태 탭 셀렉터 */}
                    <div className="flex rounded bg-stone-100 p-0.5 text-xs font-sans border border-stone-200">
                      <button
                        type="button"
                        onClick={() => setDemoState('empty')}
                        className={`px-2.5 py-1 rounded transition-colors ${
                          demoState === 'empty'
                            ? 'bg-white text-stone-900 font-semibold shadow-xs'
                            : 'text-stone-500 hover:text-stone-800'
                        }`}
                      >
                        Empty
                      </button>
                      <button
                        type="button"
                        onClick={() => setDemoState('loading')}
                        className={`px-2 py-1 rounded transition-colors ${
                          demoState === 'loading'
                            ? 'bg-white text-stone-900 font-semibold shadow-xs'
                            : 'text-stone-500 hover:text-stone-800'
                        }`}
                      >
                        Loading
                      </button>
                      <button
                        type="button"
                        onClick={() => setDemoState('error')}
                        className={`px-2 py-1 rounded transition-colors ${
                          demoState === 'error'
                            ? 'bg-white text-stone-900 font-semibold shadow-xs'
                            : 'text-stone-500 hover:text-stone-800'
                        }`}
                      >
                        Error
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* 우측 페이지 중앙 메인 콘텐츠 영역 */}
              <div className="mt-4 h-[470px]">
                {activeMode === 'm1_demo' ? (
                  <div className="h-full border border-stone-200 rounded-md overflow-hidden bg-white/50">
                    {demoState === 'empty' && (
                      <EmptyState onAction={() => setActiveMode('plan')} />
                    )}
                    {demoState === 'loading' && <LoadingState />}
                    {demoState === 'error' && (
                      <ErrorState
                        message="기록을 불러오는 중 일시적인 오류가 발생했습니다."
                        onRetry={() => setDemoState('loading')}
                      />
                    )}
                  </div>
                ) : !plan ? (
                  /* 좌측이 비어있을 때 우측 안내 영역 */
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
                  /* 수정 이력 타임라인 컴포넌트 */
                  <RevisionTimeline
                    planId={plan.id}
                    refreshTrigger={revisionTrigger}
                  />
                )}
              </div>
            </div>

            {/* 우측 페이지 하단 */}
            <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono text-stone-400">
              <span>
                ACTIVE: {activeMode === 'plan' ? 'VIEW 2 (PLAN)' : demoState.toUpperCase()}
              </span>
              <span>PAGE 02</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* [레이어 3: 3D 언폴드 표지 (z-30)] */}
      {/* 우측 480px 위치에서 왼쪽으로 -180도 회전하며 메모지 위를 덮고 속지를 개방 */}
      {/* ========================================================================= */}
      <CoverView
        isOpen={isOpen}
        isAnimating={isAnimating}
        onOpen={handleOpenCover}
      />
    </div>
  );
};
