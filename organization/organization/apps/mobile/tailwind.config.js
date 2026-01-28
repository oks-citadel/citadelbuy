/** @type {import('tailwindcss').Config} */
/**
 * Broxiva Design System - Mobile Tailwind Configuration
 * Aligned with the shared design token system for brand consistency
 */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // ============================================
        // BROXIVA DESIGN SYSTEM TOKENS (bx-*)
        // Aligned with web app for cross-platform consistency
        // ============================================
        bx: {
          // Background layers (dark atmospheric system)
          bg: {
            0: '#0D0D0D',
            1: '#1A1A2E',
            2: '#1F1F2E',
            3: '#252538',
          },
          // Text colors (high contrast for readability)
          text: {
            DEFAULT: '#F8FAFC',
            secondary: '#E2E8F0',
            muted: '#94A3B8',
            dim: '#64748B',
          },
          // Brand signature colors
          pink: '#EC4899',
          violet: '#8B5CF6',
          cyan: '#06B6D4',
          mint: '#10B981',
          gold: '#F59E0B',
          // Semantic colors
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          info: '#3B82F6',
          // Border
          border: 'rgba(255,255,255,0.08)',
        },
        // Primary - Deep Purple/Violet (Brand Identity) - Aligned with design tokens
        primary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8', // Main brand color
          900: '#581c87',
          950: '#3b0764',
          DEFAULT: '#6b21a8',
        },
        // Secondary/Accent - Gold (Luxury & Premium)
        accent: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b', // Main gold accent
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          DEFAULT: '#f59e0b',
        },
        // Neutrals - Slate grays (Modern & Sophisticated)
        neutral: {
          0: '#ffffff',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Semantic colors - Aligned with design system
        success: {
          light: '#d1fae5',
          DEFAULT: '#10b981',
          dark: '#065f46',
        },
        warning: {
          light: '#fef3c7',
          DEFAULT: '#f59e0b',
          dark: '#92400e',
        },
        error: {
          light: '#fee2e2',
          DEFAULT: '#ef4444',
          dark: '#991b1b',
        },
        info: {
          light: '#dbeafe',
          DEFAULT: '#3b82f6',
          dark: '#1e3a8a',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Inter', 'System', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.025em' }],
        sm: ['0.875rem', { lineHeight: '1.25rem', letterSpacing: '0.01em' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        xl: ['1.25rem', { lineHeight: '1.875rem', letterSpacing: '-0.015em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.02em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.025em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.03em' }],
        // Broxiva Design System typography (9/10pt scale)
        'bx-xs': ['0.75rem', { lineHeight: '1rem' }],
        'bx-sm': ['0.8125rem', { lineHeight: '1.25rem' }],
        'bx-base': ['0.875rem', { lineHeight: '1.5rem' }],
        'bx-lg': ['1rem', { lineHeight: '1.75rem' }],
      },
      // Broxiva Design System spacing (4px/8px grid)
      spacing: {
        18: '4.5rem',   // 72px
        22: '5.5rem',   // 88px
        28: '7rem',     // 112px
      },
      borderRadius: {
        sm: '0.125rem',
        DEFAULT: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
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
        // Premium colored shadows
        primary: '0 10px 30px -5px rgba(107, 33, 168, 0.3)',
        accent: '0 10px 30px -5px rgba(245, 158, 11, 0.3)',
        // Broxiva Design System shadows
        'bx-card': '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)',
        'bx-glow-pink': '0 0 40px rgba(236,72,153,0.3)',
        'bx-glow-cyan': '0 0 40px rgba(6,182,212,0.3)',
        'bx-glow-violet': '0 0 40px rgba(139,92,246,0.3)',
        'bx-glow-gold': '0 0 40px rgba(245,158,11,0.3)',
      },
      // Broxiva Design System background gradients
      backgroundImage: {
        'bx-app': 'linear-gradient(180deg, #0D0D0D 0%, #1A1A2E 100%)',
        'bx-aurora': 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 50%, #06B6D4 100%)',
        'bx-trust': 'linear-gradient(135deg, #1E3A5F 0%, #3B82F6 50%, #06B6D4 100%)',
        'bx-elite': 'linear-gradient(135deg, #92400E 0%, #F59E0B 100%)',
        'bx-glass': 'linear-gradient(180deg, rgba(31,31,46,0.8) 0%, rgba(31,31,46,0.6) 100%)',
      },
    },
  },
  plugins: [],
};
