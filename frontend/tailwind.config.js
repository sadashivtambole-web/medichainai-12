/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7', // Primary Medical Blue
          700: '#0369A1',
          800: '#075985',
          900: '#0C4A6E',
          950: '#082F49',
        },
        teal: {
          50: '#F0FDFA',
          100: '#CCFBF1',
          200: '#99F6E4',
          300: '#5EEAD4',
          400: '#2DD4BF',
          500: '#14B8A6', // Healthcare Teal
          600: '#0D9488',
          700: '#0F766E',
          800: '#115E59',
          900: '#134E4A',
        },
        navy: {
          800: '#1E293B',
          900: '#0F172A', // Primary Text Navy
          950: '#0A0F1D',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'med-sm': '0 1px 3px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(2, 132, 199, 0.03)',
        'med-md': '0 4px 16px -2px rgba(15, 23, 42, 0.06), 0 2px 6px -1px rgba(2, 132, 199, 0.04)',
        'med-lg': '0 12px 32px -4px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(2, 132, 199, 0.06)',
        'med-hover': '0 20px 40px -8px rgba(2, 132, 199, 0.16), 0 6px 16px rgba(15, 23, 42, 0.04)',
        'teal-glow': '0 0 24px -4px rgba(20, 184, 166, 0.25)',
        'blue-glow': '0 0 24px -4px rgba(2, 132, 199, 0.25)',
      },
      keyframes: {
        'float-slow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
      },
      animation: {
        'float-slow': 'float-slow 6s ease-in-out infinite',
        'pulse-subtle': 'pulse-subtle 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
