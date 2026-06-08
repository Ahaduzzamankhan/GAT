/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/renderer/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace']
      },
      colors: {
        bg: { primary: '#0a0a0a', secondary: '#111111', tertiary: '#1a1a1a', card: '#141414' },
        border: { default: '#222222', subtle: '#1a1a1a', active: '#333333' },
        text: { primary: '#ffffff', secondary: '#a0a0a0', muted: '#555555', accent: '#e0e0e0' },
        accent: { white: '#ffffff', gray: '#888888', dim: '#444444' }
      },
      borderRadius: { xl: '12px', '2xl': '16px', '3xl': '24px' },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite'
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.5' } }
      }
    }
  },
  plugins: []
}
