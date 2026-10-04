/** @type {import('tailwindcss').Config} */
// All colors, radii and fonts come from CSS variables in globals.css.
// Components never use raw hex values or Tailwind palette colors (no `bg-orange-600`):
// change a token once and the whole app follows.
const token = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: token('bg'), // page background
        surface: token('surface'), // cards, list rows
        surface2: token('surface-2'), // sheets, inputs, drawer
        'surface-2': token('surface-2'),
        ink: token('ink'), // primary text (also used for 5-10% overlays: bg-ink/10)
        muted: token('muted'), // secondary text
        faint: token('faint'), // captions, placeholders, inactive tabs
        light: token('light'), // white buttons
        'on-light': token('on-light'), // text on light surfaces
        accent: {
          DEFAULT: token('accent'), // icons, rings, underlines, text on dark
          solid: token('accent-solid'), // filled buttons and pills (white text passes AA)
          hover: token('accent-hover'),
          soft: token('accent-soft'), // text on tinted accent backgrounds
        },
        'accent-solid': token('accent-solid'),
        'accent-hover': token('accent-hover'),
        'accent-soft': token('accent-soft'),
        success: token('success'),
        danger: {
          DEFAULT: token('danger'),
          soft: token('danger-soft'),
        },
        'danger-soft': token('danger-soft'),
        warn: token('warn'),
        corner: {
          red: token('corner-red'),
          green: token('corner-green'),
          'on-red': token('on-corner-red'),
          'on-green': token('on-corner-green'),
        },
        'corner-red': token('corner-red'),
        'corner-green': token('corner-green'),
        'on-corner-red': token('on-corner-red'),
        'on-corner-green': token('on-corner-green'),
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
      },
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-body)'],
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
        out: 'var(--ease)',
      },
    },
  },
  plugins: [],
};
