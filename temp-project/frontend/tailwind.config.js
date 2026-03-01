/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0fdf9',
          100: '#ccfbef',
          200: '#99f6df',
          300: '#5eeac9',
          400: '#2dd4ae',
          500: '#14b897',
          600: '#0d9278',
          700: '#0e7562',
          800: '#115d50',
          900: '#124d43',
          950: '#052e28',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
