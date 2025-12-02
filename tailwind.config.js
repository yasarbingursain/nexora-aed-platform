/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        // Nexora Brand Colors - EXACT SPECIFICATIONS
        nexora: {
          primary: '#00D9FF', // Primary accent - cyan
          quantum: '#9D4EDD', // Quantum-related features - purple
          ai: '#06FFA5', // AI/ML features - green
          threat: '#FF006E', // Threats/critical - magenta
          success: '#06FFA5', // Success states
          warning: '#FFB800', // Warnings - amber
        },
        // Background layers for dark mode
        bg: {
          deepest: '#0A0E1A', // Page background
          deep: '#0F1420', // Card background
          elevated: '#141824', // Hover states
          overlay: '#1A1F2E', // Modals, dropdowns
        },
        // Security-focused color palette
        security: {
          critical: '#FF006E', // Critical threats - magenta
          high: '#ea580c', // High severity - orange
          medium: '#FFB800', // Medium severity - amber
          low: '#06FFA5', // Low severity - green
          info: '#00D9FF', // Info - cyan
          success: '#06FFA5', // Success - green
        },
        // Dark mode optimized colors
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'], // For hero headings
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
        arabic: ['IBM Plex Arabic', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
        'hero': ['4.5rem', { lineHeight: '1.1', fontWeight: '700' }], // 72px
        'display': ['3rem', { lineHeight: '1.2', fontWeight: '600' }], // 48px
        'subhead': ['1.5rem', { lineHeight: '1.4', fontWeight: '400' }], // 24px
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'pulse-security': 'pulseSecurityGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-critical': 'pulseCritical 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounceSubtle 1s ease-in-out',
        'glow': 'glow 2s ease-in-out infinite',
        'tilt': 'tilt 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSecurityGlow: {
          '0%, 100%': { 
            boxShadow: '0 0 0 0 rgba(0, 217, 255, 0.7)' 
          },
          '70%': { 
            boxShadow: '0 0 0 10px rgba(0, 217, 255, 0)' 
          },
        },
        pulseCritical: {
          '0%, 100%': { 
            boxShadow: '0 0 0 0 rgba(255, 0, 110, 0.7)' 
          },
          '70%': { 
            boxShadow: '0 0 0 10px rgba(255, 0, 110, 0)' 
          },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        glow: {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(0, 217, 255, 0.3)' 
          },
          '50%': { 
            boxShadow: '0 0 40px rgba(0, 217, 255, 0.6)' 
          },
        },
        tilt: {
          '0%': { transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)' },
          '100%': { transform: 'perspective(1000px) rotateX(2deg) rotateY(-5deg) translateZ(20px)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio'),
  ],
};
