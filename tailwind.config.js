/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f8fafc',
          100: '#eef2f7',
          200: '#d7e1ee',
          300: '#bccada',
          400: '#8fa3b8',
          500: '#6a8199',
          600: '#4f667e',
          700: '#3b4d62',
          800: '#273444',
          900: '#16202d',
        },
        mint: {
          50: '#f1fcf7',
          100: '#d9f6ea',
          200: '#b7edda',
          300: '#86dcc1',
          400: '#4dc3a2',
          500: '#2ea284',
          600: '#1f8268',
          700: '#1b6756',
          800: '#175245',
          900: '#114137',
        },
      },
    },
  },
  plugins: [],
}
