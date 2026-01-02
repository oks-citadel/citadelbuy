import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',    // 16px mobile
        sm: '1.5rem',       // 24px tablet
        lg: '2rem',         // 32px desktop
      },
      screens: {
        '2xl': '1440px',
      },
    },
    extend: {
      colors: {
        // ============================================
        // BROXIVA DESIGN SYSTEM TOKENS (bx-*)
        // ============================================
        bx: {
          // Background layers (dark atmospheric system)
          bg: {
            0: 'var(--bx-bg-0)',
            1: 'var(--bx-bg-1)',
            2: 'var(--bx-bg-2)',
            3: 'var(--bx-bg-3)',
          },
          // Text colors (high contrast for readability)
          text: {
            DEFAULT: 'var(--bx-text)',
            secondary: 'var(--bx-text-secondary)',
            muted: 'var(--bx-text-muted)',
            dim: 'var(--bx-text-dim)',
          },
          // Brand signature colors
          pink: 'var(--bx-pink)',
          violet: 'var(--bx-violet)',
          cyan: 'var(--bx-cyan)',
          mint: 'var(--bx-mint)',
          gold: 'var(--bx-gold)',
          // Semantic colors
          success: 'var(--bx-success)',
          warning: 'var(--bx-warning)',
          danger: 'var(--bx-danger)',
          info: 'var(--bx-info)',
          // Border
          border: 'var(--bx-border)',
        },
        // ============================================
        // LEGACY COLORS (preserved for compatibility)
        // ============================================
        // Broxiva Primary - Elegant deep navy
        primary: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d6fe',
          300: '#a5b8fc',
          400: '#8191f8',
          500: '#1a365d', // Main brand color - Deep navy
          600: '#153058',
          700: '#0f2447',
          800: '#0d1e3a',
          900: '#0a1929',
          950: '#050c14',
          DEFAULT: '#1a365d',
          foreground: '#FFFFFF',
        },
        // Broxiva Accent - Luxurious gold
        accent: {
          50: '#fff9e6',
          100: '#fff3cc',
          200: '#ffe799',
          300: '#ffdb66',
          400: '#ffcf33',
          500: '#c9a227', // Premium gold
          600: '#b8931f',
          700: '#a68418',
          800: '#8a6e14',
          900: '#6b5410',
          950: '#3d2f09',
          DEFAULT: '#c9a227',
          foreground: '#000000',
        },
        // Neutral - Sophisticated gray scale
        neutral: {
          0: '#ffffff',
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
          1000: '#000000',
        },
        // Success
        success: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          DEFAULT: '#10b981',
          foreground: '#FFFFFF',
        },
        // Warning
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          DEFAULT: '#f59e0b',
          foreground: '#000000',
        },
        // Error
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
          DEFAULT: '#ef4444',
          foreground: '#FFFFFF',
        },
        // Info
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          DEFAULT: '#3b82f6',
          foreground: '#FFFFFF',
        },
        // Legacy/Semantic Aliases
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
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
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'Times New Roman', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Courier New', 'monospace'],
        // Broxiva Design System font
        bx: ['Georgia', 'serif'],
      },
      fontSize: {
        display: ['4rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
        // Broxiva Design System typography (9/10pt)
        'bx-xs': ['0.75rem', { lineHeight: '1rem' }],
        'bx-sm': ['0.8125rem', { lineHeight: '1.25rem' }],
        'bx-base': ['0.875rem', { lineHeight: '1.5rem' }],
        'bx-lg': ['1rem', { lineHeight: '1.75rem' }],
      },
      // Broxiva Design System background gradients
      backgroundImage: {
        'bx-app': 'linear-gradient(180deg, #0D0D0D 0%, #1A1A2E 100%)',
        'bx-aurora': 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 50%, #06B6D4 100%)',
        'bx-trust': 'linear-gradient(135deg, #1E3A5F 0%, #3B82F6 50%, #06B6D4 100%)',
        'bx-elite': 'linear-gradient(135deg, #92400E 0%, #F59E0B 100%)',
        'bx-glass': 'linear-gradient(180deg, rgba(31,31,46,0.8) 0%, rgba(31,31,46,0.6) 100%)',
      },
      spacing: {
        18: '4.5rem',   // 72px
        22: '5.5rem',   // 88px
        28: '7rem',     // 112px
      },
      borderRadius: {
        sm: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        // Broxiva Design System border radius
        'bx-card': '20px',
        'bx-chip': '999px',
        'bx-modal': '24px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
        DEFAULT: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
        md: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
        lg: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        xl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        '2xl': '0 30px 60px -15px rgba(0, 0, 0, 0.3)',
        inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        // Premium branded shadows
        primary: '0 10px 30px -5px rgba(26, 54, 93, 0.3)',
        'primary-lg': '0 20px 40px -10px rgba(26, 54, 93, 0.4)',
        accent: '0 10px 30px -5px rgba(201, 162, 39, 0.3)',
        'accent-lg': '0 20px 40px -10px rgba(201, 162, 39, 0.4)',
        glow: '0 0 20px rgba(26, 54, 93, 0.15)',
        'glow-accent': '0 0 20px rgba(201, 162, 39, 0.15)',
        // Broxiva Design System shadows
        'bx-card': '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
        'bx-glow-pink': '0 0 40px rgba(236,72,153,0.3)',
        'bx-glow-cyan': '0 0 40px rgba(6,182,212,0.3)',
        'bx-glow-violet': '0 0 40px rgba(139,92,246,0.3)',
        'bx-glow-gold': '0 0 40px rgba(245,158,11,0.3)',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      keyframes: {
        // Existing animations
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'slide-in-from-top': {
          from: { transform: 'translateY(-100%)' },
          to: { transform: 'translateY(0)' },
        },
        'slide-in-from-bottom': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'slide-in-from-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        'slide-in-from-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        // New Premium Animations
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        'slide-up-fade': {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        'scale-in': {
          '0%': {
            opacity: '0',
            transform: 'scale(0.9)',
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1)',
          },
        },
        pulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        bounce: {
          '0%, 100%': { transform: 'translateY(-25%)', animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)' },
          '50%': { transform: 'translateY(0)', animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)' },
        },
        spin: {
          from: { transform: 'rotate(0deg)' },
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        // Existing animations
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'fade-out': 'fade-out 0.2s ease-out',
        'slide-in-from-top': 'slide-in-from-top 0.3s ease-out',
        'slide-in-from-bottom': 'slide-in-from-bottom 0.3s ease-out',
        'slide-in-from-left': 'slide-in-from-left 0.3s ease-out',
        'slide-in-from-right': 'slide-in-from-right 0.3s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        bounce: 'bounce 1s infinite',
        spin: 'spin 1s linear infinite',
        // New Premium Animations
        shimmer: 'shimmer 2.5s linear infinite',
        float: 'float 3s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up-fade': 'slide-up-fade 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
