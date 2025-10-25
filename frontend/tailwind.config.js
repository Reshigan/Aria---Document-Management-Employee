/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'vanta-navy': '#1a2332',
        'vanta-gold': '#FFB800',
      },
    },
  },
  plugins: [],
}
