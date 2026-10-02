import React, { useState, useEffect } from 'react';
import { PersonalizationProvider } from './context/PersonalizationContext';
import { PersonalizationToolbar } from './components/PersonalizationToolbar';
import { BinderChassis } from './components/BinderChassis';
import { Notebook, RotateCw } from 'lucide-react';

export const App: React.FC = () => {
  const [scale, setScale] = useState(1);
  const [isCoverOpen, setIsCoverOpen] = useState(false);
  const closeCoverRef = React.useRef<(() => void) | null>(null);

  // 뷰포트 오버플로우 방어: 화면 크기에 맞춰 1.5:1 바인더 비율을 유지하며 스마트 스케일링
  useEffect(() => {
    const handleResize = () => {
      const targetWidth = 1000;
      const targetHeight = 760;
      const scaleX = (window.innerWidth - 16) / targetWidth;
      const scaleY = (window.innerHeight - 16) / targetHeight;
      const calculated = Math.min(1, Math.min(scaleX, scaleY));
      setScale(Math.max(0.35, calculated));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <PersonalizationProvider>
      {/* 무채색 웜스톤 데스크 캔버스 */}
      <main className="min-h-screen w-full bg-[#EFECE6] flex items-center justify-center p-2 selection:bg-stone-300 selection:text-stone-900 overflow-hidden">
        {/* 뷰포트 스케일링 래퍼 */}
        <div
          className="flex flex-col items-center justify-center transition-transform duration-100 ease-out"
          style={{
            transform: scale < 1 ? `scale(${scale})` : undefined,
            transformOrigin: 'center center',
          }}
        >
          {/* 상단 헤더 & 개인화 툴바 컨테이너 (너비 960px 고정) */}
          <header className="w-[960px] flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2">
              <Notebook className="w-5 h-5 text-stone-700" />
              <span className="font-mono text-xs font-semibold tracking-wider text-stone-800 uppercase">
                Plan-Do-See Diary
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-200/80 text-stone-600 border border-stone-300">
                M2: Plan & Revision
              </span>
            </div>

            {/* 상단 우측: 표지 닫기 컨트롤 및 테마/글씨체 개인화 툴바 */}
            <div className="flex items-center gap-2">
              {isCoverOpen && (
                <button
                  type="button"
                  onClick={() => closeCoverRef.current?.()}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-white/70 hover:bg-white border border-[#E7E5E4] text-[#57534E] shadow-sm backdrop-blur-sm transition-colors cursor-pointer text-xs font-sans font-medium"
                  title="다이어리 표지 닫기"
                >
                  <RotateCw className="w-3.5 h-3.5 text-[#57534E]" />
                  <span>표지 닫기</span>
                </button>
              )}
              <PersonalizationToolbar />
            </div>
          </header>

          {/* 960×640px 고정 바인더 섀시 */}
          <BinderChassis
            onCoverOpenChange={(open) => setIsCoverOpen(open)}
            onRegisterCloseHandler={(fn) => {
              closeCoverRef.current = fn;
            }}
          />

          {/* 하단 풋터 */}
          <footer className="w-[960px] mt-4 px-2 flex items-center justify-between text-[11px] font-mono text-stone-500">
            <span>BINDER: 960×640px (1.5:1 RATIO) • PERSPECTIVE 1400PX</span>
            <span>ALEPH-06 DIARY 1</span>
          </footer>
        </div>
      </main>
    </PersonalizationProvider>
  );
};

export default App;
