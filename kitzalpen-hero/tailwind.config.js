const c = (name) => `color-mix(in srgb, var(--k-${name}) calc(<alpha-value> * 100%), transparent)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Seasonal palette: every brand colour is a CSS variable (see index.css),
      // so the Summer / Winter choice re-colours the whole site.
      colors: {
        forest: { DEFAULT: c('forest'), deep: c('deep'), soft: c('pine-light') },
        ivory: '#f4efe4',
        champagne: { DEFAULT: c('gold'), light: c('gold-light'), dark: c('gold-dark') },
        charcoal: '#151614',
        cream: c('cream'),
        soft: c('soft'),
        pine: { DEFAULT: c('pine'), light: c('pine-light') },
        deep: c('deep'),
        gold: { DEFAULT: c('gold'), light: c('gold-light'), dark: c('gold-dark') },
        goldink: c('goldink'),
        ink: c('ink'),
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
