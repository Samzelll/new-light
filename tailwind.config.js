/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: '#131110',
        surface: '#1c1917',
        'surface-2': '#26221f',
        surface2: '#26221f',
        line: '#2e2924',
        'line-strong': '#3a342e',
        ink: '#ece6dc',
        muted: '#a8a093',
        faint: '#928a7d',
        accent: {
          DEFAULT: '#c4a574',
          soft: '#e0c796',
          solid: '#8a6a3a',
          hover: '#735830',
        },
        'accent-soft': '#e0c796',
        'accent-solid': '#8a6a3a',
        'accent-hover': '#735830',
        'on-accent': '#2a1f0c',
        'side-a': '#c4a574',
        'side-b': '#8aa0c4',
        'on-side-b': '#101b33',
        danger: '#d9776b',
        scrim: 'rgba(19, 17, 16, 0.86)',
        light: '#ece6dc',
        'on-light': '#131110',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Lora', 'Georgia', 'serif'],
        sans: ['var(--font-body)', 'Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        caption: ['0.6875rem', { lineHeight: '1rem' }], // 11px
        tab: ['0.8125rem', { lineHeight: '1.25rem' }], // 13px
        btn: ['0.8125rem', { lineHeight: '1.25rem' }], // 13px
        body: ['0.875rem', { lineHeight: '1.4' }], // 14px
        title: ['1.0625rem', { lineHeight: '1.2' }], // 17px card titles
        heading: ['1.25rem', { lineHeight: '1.15' }], // 20px page titles
        hero: ['1.75rem', { lineHeight: '1.1' }], // 28px percentages
      },
      maxWidth: {
        app: '28rem', // 448px phone column
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
      },
    },
  },
  plugins: [],
};
