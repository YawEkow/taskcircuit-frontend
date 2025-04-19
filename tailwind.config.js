/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  safelist: [ // Add this safelist array
    'confetti', // Add the class name you want to protect
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}