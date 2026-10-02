import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  ThemeId,
  FontId,
  THEMES,
  FONTS,
  ThemeDefinition,
  FontDefinition,
} from '../types/personalization';

interface PersonalizationContextType {
  theme: ThemeId;
  font: FontId;
  setTheme: (t: ThemeId) => void;
  setFont: (f: FontId) => void;
  currentTheme: ThemeDefinition;
  currentFont: FontDefinition;
}

const PersonalizationContext = createContext<PersonalizationContextType | undefined>(undefined);

const STORAGE_KEY_THEME = 'diary_theme';
const STORAGE_KEY_FONT = 'diary_font_preference';

export const PersonalizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    try {
      const savedTheme = localStorage.getItem(STORAGE_KEY_THEME);
      if (savedTheme && savedTheme in THEMES) {
        return savedTheme as ThemeId;
      }
    } catch {
      // LocalStorage 불가 환경 대응
    }
    return 'theme-4'; // 기본값: 웜 토프 & 더스티 슬레이트
  });

  const [font, setFontState] = useState<FontId>(() => {
    try {
      const savedFont = localStorage.getItem(STORAGE_KEY_FONT);
      if (savedFont && savedFont in FONTS) {
        return savedFont as FontId;
      }
    } catch {
      // LocalStorage 불가 환경 대응
    }
    return 'normal'; // 기본값: 일반 손글씨
  });

  const setTheme = (t: ThemeId) => {
    setThemeState(t);
    try {
      localStorage.setItem(STORAGE_KEY_THEME, t);
    } catch {
      // ignore
    }
  };

  const setFont = (f: FontId) => {
    setFontState(f);
    try {
      localStorage.setItem(STORAGE_KEY_FONT, f);
    } catch {
      // ignore
    }
  };

  // CSS Root 변수 주입 (색상 및 폰트)
  useEffect(() => {
    const selectedTheme = THEMES[theme];
    const selectedFont = FONTS[font];
    const root = document.documentElement;

    root.style.setProperty('--color-cover', selectedTheme.cover);
    root.style.setProperty('--color-desk', selectedTheme.desk);
    root.style.setProperty('--color-paper', selectedTheme.paper);
    root.style.setProperty('--color-primary-tab', selectedTheme.primaryTab);
    root.style.setProperty('--color-secondary-tab', selectedTheme.secondaryTab);
    root.style.setProperty('--color-memo-bg', selectedTheme.memoBg);
    root.style.setProperty('--color-memo-text', selectedTheme.memoText);
    root.style.setProperty('--color-done-badge', selectedTheme.doneBadge);
    root.style.setProperty('--selected-font', selectedFont.fontFamily);
  }, [theme, font]);

  return (
    <PersonalizationContext.Provider
      value={{
        theme,
        font,
        setTheme,
        setFont,
        currentTheme: THEMES[theme],
        currentFont: FONTS[font],
      }}
    >
      {children}
    </PersonalizationContext.Provider>
  );
};

export const usePersonalization = (): PersonalizationContextType => {
  const context = useContext(PersonalizationContext);
  if (!context) {
    throw new Error('usePersonalization must be used within a PersonalizationProvider');
  }
  return context;
};
