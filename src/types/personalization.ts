export type ThemeId = 'theme-1' | 'theme-2' | 'theme-3' | 'theme-4';

export type FontId = 'normal' | 'adult' | 'child';

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  cover: string;
  desk: string;
  paper: string;
  primaryTab: string;
  secondaryTab: string;
  memoBg: string;
  memoText: string;
  doneBadge: string;
}

export interface FontDefinition {
  id: FontId;
  name: string;
  fontFamily: string;
}

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  'theme-1': {
    id: 'theme-1',
    name: '포레스트 세이지 & 머스터드',
    cover: '#1F2F23',
    desk: '#E5ECE6',
    paper: '#FDFBF7',
    primaryTab: '#4D7C5F',
    secondaryTab: '#D9A74A',
    memoBg: '#FEF7EA',
    memoText: '#3D2C0D',
    doneBadge: '#4D7C5F',
  },
  'theme-2': {
    id: 'theme-2',
    name: '미드나잇 네이비 & 테라코타',
    cover: '#1E2638',
    desk: '#E2E6EC',
    paper: '#FAF8F5',
    primaryTab: '#7CA5B8',
    secondaryTab: '#C85A32',
    memoBg: '#F8EDE6',
    memoText: '#8F3718',
    doneBadge: '#C85A32',
  },
  'theme-3': {
    id: 'theme-3',
    name: '매트 흑연 & 앰버',
    cover: '#2B2A27',
    desk: '#EAE4DC',
    paper: '#FBF9F4',
    primaryTab: '#8C887B',
    secondaryTab: '#E5A93C',
    memoBg: '#FEF7EA',
    memoText: '#8C5F10',
    doneBadge: '#E5A93C',
  },
  'theme-4': {
    id: 'theme-4',
    name: '웜 토프 & 더스티 슬레이트 (기본)',
    cover: '#3A3632',
    desk: '#EFECE6',
    paper: '#FDFBF7',
    primaryTab: '#4A6B82',
    secondaryTab: '#B8736B',
    memoBg: '#FDF2F2',
    memoText: '#823831',
    doneBadge: '#4A6B82',
  },
};

export const FONTS: Record<FontId, FontDefinition> = {
  normal: {
    id: 'normal',
    name: '일반 손글씨',
    fontFamily: 'NormalHandwriting',
  },
  adult: {
    id: 'adult',
    name: '어른 필기체',
    fontFamily: 'AdultHandwriting',
  },
  child: {
    id: 'child',
    name: '어린이 또박체',
    fontFamily: 'ChildHandwriting',
  },
};
