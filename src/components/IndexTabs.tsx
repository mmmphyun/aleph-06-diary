import React from 'react';
import { SectionTab } from '../types/binder';
import { Feather, BarChart3, Archive, LogOut } from 'lucide-react';

interface IndexTabsProps {
  activeTab: SectionTab;
  onSelectTab: (tab: SectionTab) => void;
  disabled?: boolean;
  peekOnly?: boolean;
  onLogout?: () => void;
}

export const IndexTabs: React.FC<IndexTabsProps> = ({
  activeTab,
  onSelectTab,
  disabled = false,
  peekOnly = false,
  onLogout,
}) => {
  const tabs: Array<{
    id: SectionTab;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    colorClass: string;
    activeColorClass: string;
  }> = [
    {
      id: 'writing',
      label: '기록',
      sublabel: 'Plan-Do-See',
      icon: <Feather className="w-3.5 h-3.5" />,
      colorClass: 'bg-amber-50 text-stone-700 hover:bg-amber-100/70 border-amber-200/80',
      activeColorClass: 'bg-amber-100 text-stone-900 font-bold border-amber-400 shadow-sm translate-x-2',
    },
    {
      id: 'review',
      label: '돌아보기',
      sublabel: 'Review',
      icon: <BarChart3 className="w-3.5 h-3.5" />,
      colorClass: 'bg-teal-50 text-stone-700 hover:bg-teal-100/70 border-teal-200/80',
      activeColorClass: 'bg-teal-100 text-stone-900 font-bold border-teal-400 shadow-sm translate-x-2',
    },
    {
      id: 'archive',
      label: '보관함',
      sublabel: 'Archive',
      icon: <Archive className="w-3.5 h-3.5" />,
      colorClass: 'bg-purple-50 text-stone-700 hover:bg-purple-100/70 border-purple-200/80',
      activeColorClass: 'bg-purple-100 text-stone-900 font-bold border-purple-400 shadow-sm translate-x-2',
    },
  ];

  return (
    <aside
      className={`absolute top-16 left-full flex flex-col gap-3 select-none transition-all duration-300 ${
        peekOnly ? '-translate-x-20 pointer-events-none opacity-30' : 'translate-x-0'
      }`}
      style={{ zIndex: 20 }}
      aria-label="바인더 대분류 인덱스 탭"
    >
      {/* M1: 상단 탭 영역 로그아웃 버튼 (T07-C95) */}
      {onLogout && (
        <button
          type="button"
          onClick={onLogout}
          disabled={disabled || peekOnly}
          tabIndex={peekOnly ? -1 : 0}
          className={`w-28 py-2 px-3 rounded-r-lg border-y border-r transition-all duration-200 flex flex-col items-start shadow-2xs bg-rose-50/90 text-stone-700 hover:bg-rose-100 hover:text-stone-900 border-rose-200/80 ${
            disabled || peekOnly ? 'cursor-default opacity-50' : 'cursor-pointer group'
          }`}
          title={peekOnly ? '로그아웃 (다이어리 전개 후 이용 가능)' : '로그아웃 및 표지 잠금'}
        >
          <div className="flex items-center gap-1.5 font-sans text-xs font-semibold">
            <LogOut className="w-3.5 h-3.5 text-stone-500 group-hover:text-rose-600 transition-colors" />
            <span>로그아웃</span>
          </div>
          <span className="font-mono text-[9px] text-stone-500 mt-0.5 tracking-wider">
            Lock & Exit
          </span>
        </button>
      )}

      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            disabled={disabled || peekOnly}
            tabIndex={peekOnly ? -1 : 0}
            className={`w-28 py-2.5 px-3 rounded-r-lg border-y border-r transition-transform duration-200 flex flex-col items-start shadow-2xs ${
              isActive && !peekOnly ? tab.activeColorClass : tab.colorClass
            } ${disabled || peekOnly ? 'cursor-default' : 'cursor-pointer group'}`}
            title={peekOnly ? `${tab.label} 섹션 (다이어리 전개 후 이용 가능)` : `${tab.label} 섹션으로 이동`}
          >
            <div className="flex items-center gap-1.5 font-sans text-xs">
              <span className="text-stone-500 group-hover:text-stone-800 transition-colors">
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </div>
            <span className="font-mono text-[9px] text-stone-500 mt-0.5 tracking-wider">
              {tab.sublabel}
            </span>
          </button>
        );
      })}
    </aside>
  );
};
