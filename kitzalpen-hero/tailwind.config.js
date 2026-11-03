/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: { DEFAULT: '#18291f', deep: '#0f1b14', soft: '#24392b' },
        ivory: '#f4efe4',
        champagne: { DEFAULT: '#d8bf8a', light: '#ecdcb4', dark: '#b8975c' },
        charcoal: '#151614',
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', 'Cormorant', 'Georgia', 'serif'],
        sans: ['Manrope', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      transitionTimingFunction: { premium: 'cubic-bezier(.22,.8,.2,1)' },
    },
  },
  plugins: [],
};
