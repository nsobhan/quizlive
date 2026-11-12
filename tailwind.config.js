/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fredoka"', 'system-ui', 'sans-serif'],
        sans: ['"Nunito"', 'system-ui', 'sans-serif'],
      },
      colors: {
        tile: {
          red: '#e21b3c',
          blue: '#1368ce',
          yellow: '#c79200',
          green: '#26890c',
        },
      },
      boxShadow: {
        chunky: '0 6px 0 0 rgba(0,0,0,0.25)',
        'chunky-sm': '0 4px 0 0 rgba(0,0,0,0.25)',
      },
    },
  },
  plugins: [],
};
