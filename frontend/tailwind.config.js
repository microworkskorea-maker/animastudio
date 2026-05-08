/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"DM Serif Display"', 'serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        forest: {
          50:  '#f0faf4',
          100: '#d8f3e3',
          200: '#aee4c5',
          300: '#77ce9f',
          400: '#3fb275',
          500: '#1d9558',
          600: '#127545',
          700: '#0f5e38',
          800: '#0d4b2e',
          900: '#0a3a23',
        },
        cream: {
          50:  '#fdfcf8',
          100: '#f9f6ee',
          200: '#f2ecda',
          300: '#e8dfc2',
        },
        ink: {
          900: '#1a1a1a',
          800: '#2d2d2d',
          600: '#4a4a4a',
          400: '#787878',
          200: '#b8b8b8',
          100: '#e2e2e2',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-up': 'fadeUp 0.4s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-8px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
