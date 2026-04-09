/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ['Manrope', 'system-ui', 'sans-serif'], mono: ['DM Mono', 'monospace'] },
      colors: {
        sidebar: { DEFAULT: '#080d18', border: '#1a2235', hover: '#111827', active: '#1e3a8a' }
      }
    }
  },
  plugins: [],
}
