/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Light mode colors
        light: {
          bg: '#FBF9F3',
          text: '#4D4D4D',
          primary: '#5A4332',
          'primary-200': '#EAE0D1',
          'primary-400': '#C8A88A',
          border: '#C8A88A',
          info: '#A3CDE4',
          highlight: '#D42A2A',
        },
        // Dark mode colors
        dark: {
          bg: '#0f172a',
          surface: '#1e293b',
          text: '#f8fafc',
          muted: '#64748b',
          subtle: '#334155',
          primary: '#3b82f6',
          chip: '#cbd5e1',
          border: '#334155',
          accent: '#06b6d4',
        },
        // Chart gradient colors
        chart: {
          start: '#5A4A7F',
          middle: '#41788A',
          end: '#AABD52',
        }
      },
      borderRadius: {
        'aqar': '16px',
      },
      spacing: {
        'aqar-xs': '4px',
        'aqar-sm': '8px',
        'aqar-md': '12px',
        'aqar-lg': '16px',
        'aqar-xl': '24px',
        'aqar-2xl': '32px',
      },
      fontSize: {
        'h1': ['24px', '28px'],
        'h2': ['20px', '24px'],
        'body': ['16px', '22px'],
        'caption': ['13px', '18px'],
      },
      animation: {
        'pulse-gentle': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scale-in': 'scaleIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #6B4F3A 0%, #8B6F47 50%, #A0845C 100%)',
        'gradient-primary-dark': 'linear-gradient(135deg, #1C3346 0%, #444F57 50%, #818991 100%)',
      }
    },
  },
  plugins: [],
};