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
      }
    },
  },
  plugins: [],
}