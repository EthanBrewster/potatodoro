/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Potato color palette
        potato: {
          raw: '#8B7355',      // Dull brown
          warm: '#CD853F',     // Peru/tan
          hot: '#FF6B35',      // Vibrant orange
          critical: '#FF4500', // Orange-red
          white: '#FFF8DC',    // Cornsilk (white-hot glow)
          baked: '#DAA520',    // Golden
        },
        // Kitchen ambiance
        kitchen: {
          dark: '#1a0f0a',
          warm: '#2d1810',
          accent: '#ff6b35',
          glow: '#ffa500',
        },
        // State colors
        state: {
          idle: '#6B7280',
          heating: '#F59E0B',
          critical: '#EF4444',
          cooling: '#3B82F6',
        }
      },
      fontFamily: {
        display: ['Dela Gothic One', 'cursive'],
        body: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-fast': 'pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shake': 'shake 0.1s linear infinite',
        'shake-intense': 'shake-intense 0.05s linear infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'steam': 'steam 2s ease-out infinite',
        'spark': 'spark 0.5s ease-out forwards',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-2px)' },
          '75%': { transform: 'translateX(2px)' },
        },
        'shake-intense': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '25%': { transform: 'translate(-4px, 2px)' },
          '50%': { transform: 'translate(4px, -2px)' },
          '75%': { transform: 'translate(-4px, -2px)' },
        },
        glow: {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(255, 107, 53, 0.5), 0 0 40px rgba(255, 107, 53, 0.3)' 
          },
          '50%': { 
            boxShadow: '0 0 40px rgba(255, 107, 53, 0.8), 0 0 80px rgba(255, 107, 53, 0.5)' 
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        steam: {
          '0%': { opacity: 0, transform: 'translateY(0) scale(0.5)' },
          '50%': { opacity: 0.6 },
          '100%': { opacity: 0, transform: 'translateY(-40px) scale(1.5)' },
        },
        spark: {
          '0%': { opacity: 1, transform: 'translateY(0) scale(1)' },
          '100%': { opacity: 0, transform: 'translateY(-20px) scale(0)' },
        },
      },
      boxShadow: {
        'potato-glow': '0 0 60px rgba(255, 107, 53, 0.6), 0 0 120px rgba(255, 69, 0, 0.4)',
        'potato-critical': '0 0 80px rgba(255, 69, 0, 0.8), 0 0 160px rgba(255, 0, 0, 0.6)',
        'inner-warm': 'inset 0 0 30px rgba(255, 107, 53, 0.3)',
      },
    },
  },
  plugins: [],
};
