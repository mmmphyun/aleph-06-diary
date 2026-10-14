import React, { useState, useRef, useEffect } from 'react';
import { Palette, PenTool, Check } from 'lucide-react';
import { usePersonalization } from '../context/PersonalizationContext';
import { ThemeId, FontId, THEMES, FONTS } from '../types/personalization';

export const PersonalizationToolbar: React.FC = () => {
  const { theme, font, setTheme, setFont } = usePersonalization();
  const [themeOpen, setThemeOpen] = useState(false);
  const [fontOpen, setFontOpen] = useState(false);

  const themeRef = useRef<HTMLDivElement>(null);
  const fontRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(event.target as Node)) {
        setThemeOpen(false);
      }
      if (fontRef.current && !fontRef.current.contains(event.target as Node)) {
        setFontOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-2 text-xs font-sans font-medium select-none">
      {/* 테마 셀렉터 */}
      <div className="relative" ref={themeRef}>
        <button
          type="button"
          onClick={() => {
            setThemeOpen(!themeOpen);
            setFontOpen(false);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-white/70 hover:bg-white border border-stone-200 text-stone-600 shadow-sm backdrop-blur-sm transition-colors"
          title="색상 테마 변경"
        >
          <Palette className="w-3.5 h-3.5 text-stone-600" />
          <span>{THEMES[theme].name.split(' (')[0]}</span>
        </button>

        {themeOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-52 bg-white rounded-md border border-stone-200 shadow-modal z-50 p-1">
            <div className="px-2 py-1 text-[11px] text-stone-400 font-medium border-b border-stone-100 mb-1">
              테마 선택
            </div>
            {(Object.keys(THEMES) as ThemeId[]).map((themeKey) => {
              const item = THEMES[themeKey];
              const isSelected = theme === themeKey;
              return (
                <button
                  key={themeKey}
                  type="button"
                  onClick={() => {
                    setTheme(themeKey);
                    setThemeOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1.5 text-left rounded text-xs transition-colors ${
                    isSelected ? 'bg-stone-100 font-semibold text-stone-900' : 'text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: item.cover }}
                    />
                    <span className="truncate">{item.name}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-stone-900 shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 폰트 셀렉터 */}
      <div className="relative" ref={fontRef}>
        <button
          type="button"
          onClick={() => {
            setFontOpen(!fontOpen);
            setThemeOpen(false);
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-white/70 hover:bg-white border border-stone-200 text-stone-600 shadow-sm backdrop-blur-sm transition-colors"
          title="손글씨 폰트 변경"
        >
          <PenTool className="w-3.5 h-3.5 text-stone-600" />
          <span>{`펜: ${FONTS[font].name}`}</span>
        </button>

        {fontOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-44 bg-white rounded-md border border-stone-200 shadow-modal z-50 p-1">
            <div className="px-2 py-1 text-[11px] text-stone-400 font-medium border-b border-stone-100 mb-1">
              손글씨 폰트 선택
            </div>
            {(Object.keys(FONTS) as FontId[]).map((fontKey) => {
              const item = FONTS[fontKey];
              const isSelected = font === fontKey;
              return (
                <button
                  key={fontKey}
                  type="button"
                  onClick={() => {
                    setFont(fontKey);
                    setFontOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2 py-1.5 text-left rounded text-xs transition-colors ${
                    isSelected ? 'bg-stone-100 font-semibold text-stone-900' : 'text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <span style={{ fontFamily: item.fontFamily }} className="text-sm truncate">
                    {item.name}
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-stone-900 shrink-0 ml-1" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
