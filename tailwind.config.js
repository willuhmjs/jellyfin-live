/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        background: '#0B1221',
        sidebar: '#0f172a', // Darker blue/black
        card: '#161e31', // Slightly lighter for cards
        'card-hover': '#1e293b',
        accent: '#3b82f6',
        'accent-glow': '#60a5fa',
        success: '#10b981',
      }
    },
  },
  plugins: [],
}
