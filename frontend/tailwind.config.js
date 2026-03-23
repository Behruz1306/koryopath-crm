/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e8edf7',
          100: '#c5d0ec',
          200: '#9fb1e0',
          300: '#7892d4',
          400: '#5b7bcb',
          500: '#3e64c2',
          600: '#3758b0',
          700: '#2d489a',
          800: '#243a84',
          900: '#0F2D7A', // Korean blue
          950: '#091c52',
        },
        gold: {
          50: '#fdf6e9',
          100: '#f9e6c4',
          200: '#f3d49c',
          300: '#edc274',
          400: '#e8b455',
          500: '#C4912A', // Uzbek gold
          600: '#a87824',
          700: '#8a601e',
          800: '#6d4b18',
          900: '#573c13',
        },
        korean: {
          blue: '#0F2D7A',
          red: '#C60C30',
          white: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans KR', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'count-up': 'countUp 1s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
