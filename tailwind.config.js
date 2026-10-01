/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          desk: '#EFECE6', // 무채색 웜스톤 데스크
        },
        theme: {
          cover: 'var(--color-cover)',
          paper: 'var(--color-paper)',
          primaryTab: 'var(--color-primary-tab)',
          secondaryTab: 'var(--color-secondary-tab)',
          memoBg: 'var(--color-memo-bg)',
          memoText: 'var(--color-memo-text)',
          doneBadge: 'var(--color-done-badge)',
        },
        editorial: {
          textPrimary: '#1C1917',
          textSecondary: '#57534E',
          textMuted: '#A8A29E',
          borderLight: '#F5F5F4',
          errorSplash: 'rgba(120, 53, 15, 0.15)',
        },
      },
      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'D2Coding', 'ui-monospace', 'Pretendard', 'sans-serif'],
        handwriting: ['var(--selected-font)', 'cursive', 'sans-serif'],
        'handwriting-normal': ['NormalHandwriting', 'cursive', 'sans-serif'],
        'handwriting-adult': ['AdultHandwriting', 'cursive', 'sans-serif'],
        'handwriting-child': ['ChildHandwriting', 'cursive', 'sans-serif'],
      },
      boxShadow: {
        chassis: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        spineCrease: 'inset 0 0 15px rgba(0, 0, 0, 0.15)',
        memo: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
        modal: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
      },
      keyframes: {
        penNibWiggle: {
          '0%, 100%': { transform: 'translateX(-3px) rotate(-5deg)' },
          '50%': { transform: 'translateX(3px) rotate(5deg)' },
        },
      },
      animation: {
        'pen-nib': 'penNibWiggle 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
