import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}', '../packages/ui/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2', // brand color
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        sidebar: {
          DEFAULT: '#0a1628', // dark navy
          hover: '#0f2040',
          active: '#163352',
          border: '#0d1c35',
          text: '#e0f2fe',
          muted: '#7dd3fc',
        },
      },
      fontFamily: {
        sans: ['var(--font-prompt)', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
