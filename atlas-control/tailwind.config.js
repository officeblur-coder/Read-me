/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Derived from atlassport.ro: deep pitch green + lime accent on near-black.
        brand: {
          50: '#eef7f1', 100: '#d5ecdd', 200: '#a9d8bb', 300: '#73bd92', 400: '#3f9c69',
          500: '#178650', 600: '#0e713c', 700: '#0a5c31', 800: '#074b27', 900: '#05341c', 950: '#03200f',
        },
        lime: { 300: '#c4e391', 400: '#a8d566', 500: '#8cc63f', 600: '#72a72d' },
        ink: { 900: '#0f1512', 800: '#18201b', 700: '#232c26', 600: '#3a443e', 500: '#5b655f', 400: '#848d87', 300: '#b3bab5', 200: '#d9ddda', 100: '#ebeeec', 50: '#f5f6f4' },
        warn: { 50: '#fdf6e3', 100: '#fbecc2', 500: '#d69a0b', 600: '#b07e06', 700: '#8a6205' },
        risk: { 50: '#fdeeec', 100: '#fad7d2', 500: '#d0402b', 600: '#b3311e', 700: '#8f2717' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,20,0.04), 0 1px 3px rgba(16,24,20,0.04)',
        pop: '0 12px 32px -8px rgba(16,24,20,0.18), 0 4px 8px -4px rgba(16,24,20,0.08)',
      },
      keyframes: {
        'fade-up': { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'none' } },
        'pulse-ring': { '0%': { transform: 'scale(.6)', opacity: .7 }, '100%': { transform: 'scale(2.4)', opacity: 0 } },
      },
      animation: {
        'fade-up': 'fade-up .35s cubic-bezier(.2,.7,.2,1) both',
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(.2,.7,.2,1) infinite',
      },
    },
  },
  plugins: [],
};
