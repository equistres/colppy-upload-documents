/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'colppy-blue': '#1e40af',
        'colppy-light-blue': '#3b82f6',
      }
    },
  },
  plugins: [],
}