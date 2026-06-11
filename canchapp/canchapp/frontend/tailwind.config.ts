import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        cream: '#F5F1E8',
        ink: '#0A0A0A',
        pitch: {
          50: '#EFFBF1',
          100: '#DAF4DF',
          400: '#7CD992',
          500: '#3FB55C',
          700: '#1E6B34',
          900: '#0E3B2E',
        },
        clay: '#FF6B35',
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      boxShadow: {
        brut: '4px 4px 0 0 #0A0A0A',
        brutLg: '8px 8px 0 0 #0A0A0A',
      },
    },
  },
  plugins: [],
};
export default config;
