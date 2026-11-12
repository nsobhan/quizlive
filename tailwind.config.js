/** @type {import('tailwindcss').Config} */
// Fluent-inspired theme: Microsoft blue primary, Microsoft yellow accent, Fluent neutrals,
// Segoe UI typography, smaller corner radii and soft elevation shadows.
const segoe = ['"Segoe UI Variable Display"', '"Segoe UI"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Helvetica Neue"', 'Arial', 'sans-serif'];

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { display: segoe, sans: segoe },
      colors: {
        brand: {
          50: '#eff6fc', 100: '#deecf9', 200: '#c7e0f4', 300: '#71afe5', 400: '#2b88d8',
          500: '#1a86d9', 600: '#0078d4', 700: '#106ebe', 800: '#005a9e', 900: '#004578', 950: '#002e50',
        },
        accent: { 100: '#fff4ce', 200: '#ffe7a3', 300: '#ffc83d', 400: '#ffb900', 500: '#e3a400' },
        // Fluent neutral grays (override Tailwind's slate)
        slate: {
          50: '#faf9f8', 100: '#f3f2f1', 200: '#edebe9', 300: '#e1dfdd', 400: '#a19f9d',
          500: '#605e5c', 600: '#484644', 700: '#323130', 800: '#292827', 900: '#201f1e',
        },
        rose: { 50: '#fdf3f4', 200: '#f1bbbc', 500: '#dc5e62', 600: '#d13438' },
        emerald: { 500: '#13a10e', 600: '#107c10' },
        // Answer tiles: the four Microsoft colors, tuned for readable text
        tile: { red: '#d83b01', blue: '#0078d4', yellow: '#ffb900', green: '#107c10' },
      },
      borderRadius: { xl: '6px', '2xl': '8px', '3xl': '12px' },
      boxShadow: {
        chunky: '0 6.4px 14.4px 0 rgba(0,0,0,0.18), 0 1.2px 3.6px 0 rgba(0,0,0,0.14)',
        'chunky-sm': '0 3.2px 7.2px 0 rgba(0,0,0,0.16), 0 0.6px 1.8px 0 rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
};
