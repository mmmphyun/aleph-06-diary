import React from 'react';
import { PersonalizationProvider } from './context/PersonalizationContext';
import { PersonalizationToolbar } from './components/PersonalizationToolbar';
import { BinderChassis } from './components/BinderChassis';
import { Notebook } from 'lucide-react';

export const App: React.FC = () => {
  return (
    <PersonalizationProvider>
      {/* 무채색 웜스톤 데스크 캔버스 (bg-[#EFECE6], min-w-[960px], 저급 텍스처 배제) */}
      <main className="min-h-screen w-full bg-[#EFECE6] min-w-[960px] flex flex-col items-center justify-center p-8 selection:bg-stone-300 selection:text-stone-900">
        {/* 상단 헤더 & 개인화 툴바 컨테이너 (너비 960px 고정 매칭) */}
        <header className="w-[960px] flex items-center justify-between mb-4 px-2">
          <div className="flex items-center gap-2">
            <Notebook className="w-5 h-5 text-stone-700" />
            <span className="font-mono text-xs font-semibold tracking-wider text-stone-800 uppercase">
              Plan-Do-See Diary
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-200/80 text-stone-600 border border-stone-300">
              M1: Skeleton & Cover
            </span>
          </div>

          {/* 상단 개인화 툴바 (4종 테마 + 3종 폰트) */}
          <PersonalizationToolbar />
        </header>

        {/* 960×640px 고정 바인더 섀시 */}
        <BinderChassis />

        {/* 하단 단축 안내 및 풋터 */}
        <footer className="w-[960px] mt-4 px-2 flex items-center justify-between text-[11px] font-mono text-stone-500">
          <span>BINDER: 960×640px (1.5:1 RATIO) • PERSPECTIVE 1400PX</span>
          <span>ALEPH-06 DIARY 1</span>
        </footer>
      </main>
    </PersonalizationProvider>
  );
};

export default App;
