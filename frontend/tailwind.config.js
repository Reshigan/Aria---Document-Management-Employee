/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#1a2332',
          light: '#232d3f',
          dark: '#0f1419',
        },
        gold: {
          DEFAULT: '#FFB800',
          hover: '#e6a600',
          light: 'rgba(255, 184, 0, 0.1)',
        },
      },
      backgroundColor: {
        primary: '#0f1419',
        secondary: '#1a2332',
        card: '#232d3f',
      },
      textColor: {
        primary: '#ffffff',
        secondary: '#a0aec0',
        muted: '#718096',
      },
      borderColor: {
        DEFAULT: '#2d3748',
        light: 'rgba(255, 255, 255, 0.1)',
      },
    },
  },
  plugins: [],
}
