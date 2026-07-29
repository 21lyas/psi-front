/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          500: '#4f6ef7',
          600: '#3d5ce8',
          700: '#2d49d4',
        },
        sidebar: '#0f1623',
        'sidebar-hover': '#1a2436',
      },
    },
  },
  plugins: [],
}

