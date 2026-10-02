import React from 'react';
import { SectionTab } from '../types/binder';
import { Feather, BarChart3, Archive } from 'lucide-react';

interface IndexTabsProps {
  activeTab: SectionTab;
  onSelectTab: (tab: SectionTab) => void;
  disabled?: boolean;
  peekOnly?: boolean;
}

export const IndexTabs: React.FC<IndexTabsProps> = ({
  activeTab,
  onSelectTab,
  disabled = false,
  peekOnly = false,
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
      colorClass: 'bg-[#FAF0E6] text-stone-700 hover:bg-[#F5E6D3] border-amber-200/80',
      activeColorClass: 'bg-[#F2DFCE] text-stone-900 font-bold border-amber-400 shadow-sm translate-x-2',
    },
    {
      id: 'review',
      label: '돌아보기',
      sublabel: 'Review',
      icon: <BarChart3 className="w-3.5 h-3.5" />,
      colorClass: 'bg-[#EBF2F0] text-stone-700 hover:bg-[#DFEBE8] border-teal-200/80',
      activeColorClass: 'bg-[#D2E4E0] text-stone-900 font-bold border-teal-400 shadow-sm translate-x-2',
    },
    {
      id: 'archive',
      label: '보관함',
      sublabel: 'Archive',
      icon: <Archive className="w-3.5 h-3.5" />,
      colorClass: 'bg-[#F4EFF4] text-stone-700 hover:bg-[#EAE2EA] border-purple-200/80',
      activeColorClass: 'bg-[#DFD3DF] text-stone-900 font-bold border-purple-400 shadow-sm translate-x-2',
    },
  ];

  return (
    <aside
      className={`absolute top-16 z-50 flex flex-col gap-3 select-none transition-all duration-300 ${
        peekOnly ? '-right-5 pointer-events-none opacity-75' : '-right-7'
      }`}
      aria-label="바인더 대분류 인덱스 탭"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            disabled={disabled || peekOnly}
            tabIndex={peekOnly ? -1 : 0}
            className={`w-28 py-2.5 px-3 rounded-r-lg border-y border-r transition-all duration-200 flex flex-col items-start shadow-2xs ${
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
            <span className="font-mono text-[9px] text-stone-400 mt-0.5 tracking-wider uppercase">
              {tab.sublabel}
            </span>
          </button>
        );
      })}
    </aside>
  );
};
