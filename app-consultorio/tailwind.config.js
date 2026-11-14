/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class", // muy importante
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        dark: {
          bg: '#05090e',
          card: '#0c131d',
          border: '#172233',
        },
      },
      backgroundImage: {
        'grid-pattern':
          'linear-gradient(to right, rgba(20, 184, 166, 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(20, 184, 166, 0.05) 1px, transparent 1px)',
        'grid-pattern-light':
          'linear-gradient(to right, rgba(13, 148, 136, 0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(13, 148, 136, 0.07) 1px, transparent 1px)',
      },
      keyframes: {
        'pulse-slow': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.05)' },
        },
      },
      animation: {
        'ambient-glow': 'pulse-slow 8s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },

    },
  },
  plugins: [],
}