import React, { useState } from 'react';
import { SpineDivider } from './SpineDivider';
import { CoverView } from './CoverView';
import { DeskMemoSheet } from './DeskMemoSheet';
import { IndexTabs } from './IndexTabs';
import { WritingCanvas } from './WritingCanvas';
import { SectionTab } from '../types/binder';
import { RotateCw, BarChart3, Trash2 } from 'lucide-react';

export const BinderChassis: React.FC = () => {
  // 다이어리 개폐 상태: 'closed'(Frame 0 닫힘) | 'opened'(표지 열림 완료 후 바닥 고정)
  const [isOpen, setIsOpen] = useState(false);

  // Tier 1: 우측 돌출 인덱스 탭 상태 ('writing' | 'review' | 'archive')
  const [activeTab, setActiveTab] = useState<SectionTab>('writing');

  // Tier 2: 기록 섹션 내부 스프레드 인덱스 (0: 계획, 1: 할 일, 2: 실행 일지)
  const [writingSpread, setWritingSpread] = useState(0);

  // Page Flip Cascade 모션 플래그 (탭 전환 시 촤라락 넘김)
  const [isCascading, setIsCascading] = useState(false);

  // 앞표지 오픈: 단 1회 좌측 바닥(Inside Cover)으로 안착 후 영구 고정
  const handleOpenCover = () => {
    setIsOpen(true);
  };

  // 앞표지 닫기: 닫힌 상태로 복귀
  const handleCloseCover = () => {
    setIsOpen(false);
    setWritingSpread(0);
    setActiveTab('writing');
  };

  // 인덱스 탭 전환 (Page Flip Cascade 모션)
  const handleSelectTab = (tab: SectionTab) => {
    if (tab === activeTab || isCascading) return;
    setIsCascading(true);
    setTimeout(() => {
      setActiveTab(tab);
      setIsCascading(false);
    }, 250);
  };

  return (
    <div className="relative w-[960px] h-[640px] perspective-1400">
      {/* ========================================================================= */}
      {/* [레이어 1: 닫힘 상태 베이스] 좌측 데스크 메모지 + 우측 닫힌 하드커버 앞표지 */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-between pointer-events-none">
        {/* 좌측 480px: 웜스톤 데스크 위의 에디토리얼 메모지 */}
        <div
          className={`w-[480px] h-[640px] flex items-center justify-center p-4 transition-opacity duration-300 ${
            !isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0'
          }`}
        >
          <DeskMemoSheet />
        </div>

        {/* 우측 480px: 닫힌 다이어리 하드커버 베이스 */}
        <div
          className={`w-[480px] h-[640px] rounded-xl border-4 border-[#2E2A27] shadow-chassis relative transition-opacity duration-300 ${
            !isOpen ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundColor: 'var(--color-cover)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          }}
        />
      </div>

      {/* ========================================================================= */}
      {/* [레이어 2: 펼침 상태 양면 바인더 섀시 (960×640px)] 속지 캔버스 */}
      {/* ========================================================================= */}
      <div
        className={`absolute inset-0 w-[960px] h-[640px] rounded-xl border-4 border-[#2E2A27] shadow-chassis overflow-visible z-10 transition-opacity duration-300 ${
          !isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{
          backgroundColor: 'var(--color-cover)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        }}
      >
        {/* 우측 돌출 인덱스 탭 (Tier 1: 대분류) */}
        {isOpen && (
          <IndexTabs
            activeTab={activeTab}
            onSelectTab={handleSelectTab}
            disabled={isCascading}
          />
        )}

        {/* 바인더 내부 양면 페이퍼 컨테이너 */}
        <div
          className={`relative w-full h-full flex rounded-lg overflow-hidden transform-style-preserve-3d transition-transform duration-250 ${
            isCascading ? 'scale-[0.98] rotate-y-[-4deg] opacity-70' : 'scale-100 rotate-y-0 opacity-100'
          }`}
        >
          {/* 중앙 제본선 음영 */}
          <div className="absolute left-[472px] top-0 bottom-0 z-30 pointer-events-none">
            <SpineDivider />
          </div>

          {/* ---------------- 탭별 본문 컨텐츠 ---------------- */}
          {activeTab === 'writing' && (
            /* [기록 캔버스] 계획 -> 할 일 -> 실행 일지 3대 섹션 전개 */
            <WritingCanvas
              currentSpread={writingSpread}
              onNavigateSpread={(idx) => setWritingSpread(idx)}
            />
          )}

          {activeTab === 'review' && (
            /* [돌아보기 섹션] 4대 지표 캔버스 */
            <div
              className="w-full h-full p-8 flex flex-col justify-between"
              style={{ backgroundColor: 'var(--color-paper)' }}
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-teal-700" />
                  <span className="font-mono text-xs font-semibold text-stone-700">REVIEW SECTION</span>
                </div>
                <span className="font-mono text-[11px] text-stone-400">PAGE 07-08</span>
              </div>
              <div className="my-auto text-center space-y-3">
                <div className="font-handwriting text-3xl text-stone-800">기록과 실행의 궤적</div>
                <p className="font-sans text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
                  작성된 계획과 실행 완료 일지를 바탕으로 통계 지표와 평균 시간 오차를 산출하는 돌아보기 섹션입니다.
                </p>
              </div>
              <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono text-stone-400">
                <span>ALEPH-06 REVIEW</span>
                <span>PAGE 07</span>
              </div>
            </div>
          )}

          {activeTab === 'archive' && (
            /* [보관함 섹션] 삭제된 카드 보관함 */
            <div
              className="w-full h-full p-8 flex flex-col justify-between"
              style={{ backgroundColor: 'var(--color-paper)' }}
            >
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4 text-purple-700" />
                  <span className="font-mono text-xs font-semibold text-stone-700">ARCHIVE SECTION</span>
                </div>
                <span className="font-mono text-[11px] text-stone-400">PAGE 09-10</span>
              </div>
              <div className="my-auto text-center space-y-3">
                <div className="font-handwriting text-3xl text-stone-800">지워진 생각의 보관함</div>
                <p className="font-sans text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
                  삭제된 계획과 할 일 카드가 구겨진 음영과 마스킹 테이프로 안전하게 보관되는 휴지통 섹션입니다.
                </p>
              </div>
              <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[10px] font-mono text-stone-400">
                <span>ALEPH-06 ARCHIVE</span>
                <span>PAGE 09</span>
              </div>
            </div>
          )}
        </div>

        {/* 좌측 하단 절대 고정: 표지 닫기 버튼 */}
        {isOpen && (
          <div className="absolute bottom-3 left-4 z-40">
            <button
              type="button"
              onClick={handleCloseCover}
              className="px-2.5 py-1 rounded bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-700 font-sans font-medium text-xs transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
              title="다이어리 표지 닫기"
            >
              <RotateCw className="w-3 h-3" />
              <span>표지 닫기</span>
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* [레이어 3: 앞표지 (CoverView)] */}
      {/* 최초 1회만 -180도 열려 좌측 바닥(Inside Cover)으로 안착 후 영구 고정 */}
      {/* ========================================================================= */}
      <CoverView
        isOpen={isOpen}
        onOpen={handleOpenCover}
        onClose={handleCloseCover}
        disabled={isOpen}
      />
    </div>
  );
};
