/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'colppy': '#6633cc',
        'colppy-hover': '#5229a3',
        'colppy-light': '#8855dd',
      },
      boxShadow: {
        'neo': '12px 12px 24px #bebebe, -12px -12px 24px #ffffff',
        'neo-inset': 'inset 6px 6px 12px #bebebe, inset -6px -6px 12px #ffffff',
        'glass': '0 8px 32px 0 rgba(102, 51, 204, 0.2)',
        'float': '0 20px 60px rgba(102, 51, 204, 0.3)',
        'glow': '0 0 40px rgba(102, 51, 204, 0.4)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 3s infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
}