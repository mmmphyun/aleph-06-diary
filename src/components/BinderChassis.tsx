import React, { useState } from 'react';
import { SpineDivider } from './SpineDivider';
import { CoverView } from './CoverView';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';
import { ErrorState } from './ErrorState';
import { BookMarked, Eye, RotateCw } from 'lucide-react';

export const BinderChassis: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // M1 단계: 3대 정적 상태 검증 탭 상태 ('empty' | 'loading' | 'error')
  const [demoState, setDemoState] = useState<'empty' | 'loading' | 'error'>('empty');

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

  return (
    <div className="relative">
      {/* 바인더 섀시 본체 (960×640px 1.5:1 고정 규격) */}
      <div
        className="relative w-[960px] h-[640px] rounded-xl border-4 border-[#2E2A27] shadow-chassis perspective-1400 overflow-hidden"
        style={{
          backgroundColor: 'var(--color-cover)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        }}
      >
        {/* 양면 내지 속지 컨테이너 (왼쪽 480px + 오른쪽 480px = 960px) */}
        <div className="relative w-full h-full flex transform-style-preserve-3d">
          {/* 좌측 내지 페이지 (Left Page: 480×640px) */}
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
                <div className="font-mono text-[11px] text-stone-400">
                  MILESTONE 1 / SCAFFOLD
                </div>
              </div>

              {/* 좌측 페이지 타이틀 */}
              <div className="mt-6">
                <h1 className="font-handwriting text-2xl text-stone-800 leading-snug">
                  오늘의 다이어리
                </h1>
                <p className="font-sans text-xs text-stone-500 mt-2 leading-relaxed">
                  바인더 섀시 규격(960×640px)과 2.5D 인터랙션 골격이 준비되었습니다. 우측 페이지에서 M1 3대 정적 상태 뷰를 확인하세요.
                </p>
              </div>

              {/* M1 규격 검증 현황 안내 박스 */}
              <div className="mt-6 p-4 rounded bg-[#FAF9F6] border border-stone-200 text-xs font-mono space-y-2 text-stone-600">
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

            {/* 좌측 페이지 하단: 표지 닫기 제어 버튼 */}
            <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
              <span className="font-mono text-[10px] text-stone-400">PAGE 01</span>
              {isOpen && (
                <button
                  type="button"
                  onClick={handleCloseCover}
                  disabled={isAnimating}
                  className="px-3 py-1.5 rounded bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-700 font-mono text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RotateCw className="w-3 h-3" />
                  <span>표지 닫기</span>
                </button>
              )}
            </div>
          </div>

          {/* 중앙 16px 제본선 음영 */}
          <SpineDivider />

          {/* 우측 내지 페이지 (Right Page: 480×640px) */}
          <div
            className="w-[480px] h-full p-8 flex flex-col justify-between"
            style={{
              backgroundColor: 'var(--color-paper)',
            }}
          >
            {/* 우측 페이지 상단: 3대 상태 뷰 검증 탭 */}
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div className="flex items-center gap-1.5 text-xs font-mono text-stone-500">
                  <Eye className="w-3.5 h-3.5" />
                  <span>상태 뷰 검증</span>
                </div>

                {/* 3대 상태 탭 셀렉터 */}
                <div className="flex rounded bg-stone-100 p-0.5 text-[11px] font-mono border border-stone-200">
                  <button
                    type="button"
                    onClick={() => setDemoState('empty')}
                    className={`px-2 py-1 rounded transition-colors ${
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
              </div>

              {/* 우측 페이지 중앙: 활성 정적 상태 뷰 렌더링 영역 */}
              <div className="mt-4 h-[440px] border border-stone-200 rounded-md overflow-hidden bg-white/50">
                {demoState === 'empty' && (
                  <EmptyState onAction={() => alert('계획 작성 모달은 [M2] 단계에서 연결됩니다.')} />
                )}
                {demoState === 'loading' && <LoadingState />}
                {demoState === 'error' && (
                  <ErrorState
                    message="기록을 불러오는 중 일시적인 오류가 발생했습니다."
                    onRetry={() => setDemoState('loading')}
                  />
                )}
              </div>
            </div>

            {/* 우측 페이지 하단 */}
            <div className="pt-2 flex items-center justify-between text-[10px] font-mono text-stone-400">
              <span>ACTIVE VIEW: {demoState.toUpperCase()}</span>
              <span>PAGE 02</span>
            </div>
          </div>
        </div>

        {/* View 0 (표지) 및 2.5D 인터랙션 */}
        <CoverView
          isOpen={isOpen}
          isAnimating={isAnimating}
          onOpen={handleOpenCover}
        />
      </div>
    </div>
  );
};
