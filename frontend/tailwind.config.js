/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        zamtel: {
          green: '#00843D',
          'green-dark': '#006B32',
          'green-light': '#00A64D',
          pink: '#E4007C',
          'pink-dark': '#B8005E',
        },
      },
    },
  },
  plugins: [],
};
