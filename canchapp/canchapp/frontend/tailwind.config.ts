import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F7F9F6',
        surface: '#FFFFFF',
        ink: '#173B32',
        forest: '#123C32',
        sky: '#DCEFFD',
        pitch: {
          50: '#F1FBF3',
          100: '#E0F7E5',
          400: '#60D174',
          500: '#35B957',
          700: '#19763A',
          900: '#123C32',
        },
        clay: '#FF6B4A',
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      boxShadow: {
        brut: '0 4px 14px rgba(18, 60, 50, 0.10)',
        brutLg: '0 10px 26px rgba(18, 60, 50, 0.14)',
      },
    },
  },
  plugins: [],
};
export default config;
