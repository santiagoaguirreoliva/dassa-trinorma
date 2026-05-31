/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        /* DASSA Marca 4.0 — Montserrat única tipografía de marca · JetBrains Mono para datos */
        sans: ['Montserrat', 'system-ui', 'Helvetica Neue', 'sans-serif'],
        display: ['Montserrat', 'system-ui', 'Helvetica Neue', 'sans-serif'],
        wordmark: ['Montserrat', 'system-ui', 'sans-serif'],
        secondary: ['Montserrat', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        /* DASSA brand · Manual de Marca 4.0 (mayo 2026) */
        'dassa-red':     { DEFAULT: '#BF1E2E', light: '#E0303E', deep: '#A8121E', bordo: '#A8121E', 'bordo-dark': '#7A0C14', tint: '#FBE5E6' },
        'dassa-celeste': { DEFAULT: '#5BBDC9', deep: '#1F979C', tint: '#DDF2F3' },
        'dassa-aqua':    { DEFAULT: '#5BBDC9', deep: '#1F979C', tint: '#DDF2F3' },
        'dassa-navy':    { DEFAULT: '#2C5278', deep: '#1E3A57' },
        'dassa-cream':   '#F5EFE3',
        'dassa-ink':     '#1A1A1A',
        /* Sidebar 4.0 — tinta neutra, acento aqua */
        sidebar: { DEFAULT: '#1A1A1A', border: '#2E2E2E', hover: '#262625', active: '#5BBDC9' },
        /* Severity tokens — alertas y prioridades semánticas (escala funcional, no marca) */
        severity: {
          critical: '#dc2626',  /* rojo crítico — NPR > 64, NCs urgentes */
          high:     '#f97316',  /* naranja alto — alertas */
          medium:   '#f59e0b',  /* ámbar medio — pendientes */
          low:      '#10b981',  /* verde bajo — todo OK */
          info:     '#3b82f6',  /* azul info */
        },
      },
      borderRadius: {
        /* Radios generosos · Manual 4.0 (esquinas 18-24px) */
        'card': '18px',
        'dassa': '24px',
      },
      boxShadow: {
        'dassa-card': '0 4px 12px rgba(26,26,26,.08), 0 1px 3px rgba(26,26,26,.06)',
        'dassa-hero': '0 24px 60px rgba(200,32,44,.16), 0 6px 12px rgba(26,26,26,.08)',
      },
    }
  },
  plugins: [],
}
