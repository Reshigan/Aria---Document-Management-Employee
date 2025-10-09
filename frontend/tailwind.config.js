/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Corporate Primary Colors - Navy & Slate
        primary: {
          darker: '#1a2332',
          dark: '#2c3e50',
          DEFAULT: '#34495e',
          light: '#546e7a',
          lighter: '#78909c',
          50: '#f5f7f9',
          100: '#e8ecef',
          200: '#d1d9de',
          300: '#a9b7c1',
          400: '#78909c',
          500: '#546e7a',
          600: '#455a64',
          700: '#34495e',
          800: '#2c3e50',
          900: '#1a2332',
        },
        // Corporate Accent - Teal
        accent: {
          darker: '#138d75',
          dark: '#16a085',
          DEFAULT: '#1abc9c',
          light: '#48c9b0',
          lighter: '#76d7c4',
          50: '#e8f8f5',
          100: '#d1f2eb',
          200: '#a3e4d7',
          300: '#76d7c4',
          400: '#48c9b0',
          500: '#1abc9c',
          600: '#17a689',
          700: '#16a085',
          800: '#138d75',
          900: '#117a65',
        },
        // Premium Gold
        gold: {
          darker: '#d68910',
          dark: '#f39c12',
          DEFAULT: '#f1c40f',
          light: '#f4d03f',
          lighter: '#f9e79f',
        },
        // Professional Grays
        neutral: {
          darkest: '#212121',
          darker: '#424242',
          dark: '#616161',
          DEFAULT: '#757575',
          light: '#9e9e9e',
          lighter: '#e0e0e0',
          lightest: '#f5f5f5',
        },
        // Semantic Colors
        success: '#27ae60',
        warning: '#f39c12',
        error: '#e74c3c',
        info: '#3498db',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #1a2332 0%, #2c3e50 50%, #34495e 100%)',
        'gradient-accent': 'linear-gradient(135deg, #16a085 0%, #1abc9c 100%)',
        'gradient-gold': 'linear-gradient(135deg, #f39c12 0%, #f1c40f 100%)',
        'gradient-hero': 'linear-gradient(135deg, #1a2332 0%, #2c3e50 50%, #16a085 100%)',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // Disable Tailwind's base styles to avoid conflicts with Ant Design
  },
}
