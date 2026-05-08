/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'Helvetica Neue', 'system-ui', 'sans-serif'],
        display: ['Montserrat', 'Helvetica Neue', 'system-ui', 'sans-serif'],
        wordmark: ['Montserrat Alternates', 'Montserrat', 'sans-serif'],
        secondary: ['Open Sans', 'Montserrat', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        /* DASSA brand */
        'dassa-red':     { DEFAULT: '#BF1E2E', light: '#E84252', deep: '#9A1825', bordo: '#7A1320', 'bordo-dark': '#4D0C16', tint: '#FBE7E9' },
        'dassa-celeste': { DEFAULT: '#5BBDC9', deep: '#2E96A4', tint: '#E2F4F7' },
        'dassa-navy':    { DEFAULT: '#0F1A4A', deep: '#0A1235' },
        /* Sidebar tokens (keep backward compat) */
        sidebar: { DEFAULT: '#0F1A4A', border: '#1a2a5e', hover: '#1a2a5e', active: '#5BBDC9' },
      },
      boxShadow: {
        'dassa-card': '0 4px 12px rgba(20,20,20,.08), 0 1px 3px rgba(20,20,20,.06)',
        'dassa-hero': '0 24px 60px rgba(190,30,45,.18), 0 6px 12px rgba(20,20,20,.08)',
      },
    }
  },
  plugins: [],
}
