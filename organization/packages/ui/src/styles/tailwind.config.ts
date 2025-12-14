/**
 * Broxiva Design System - Tailwind CSS Configuration
 *
 * This file provides Tailwind CSS configuration based on Broxiva design tokens.
 * Import this in your tailwind.config.js to use the design system with Tailwind.
 */

import { broxivaDesignTokens } from './broxiva-design-tokens';

export const broxivaTailwindConfig = {
  theme: {
    extend: {
      colors: {
        // Primary colors
        primary: {
          50: broxivaDesignTokens.colors.primary[50],
          100: broxivaDesignTokens.colors.primary[100],
          200: broxivaDesignTokens.colors.primary[200],
          300: broxivaDesignTokens.colors.primary[300],
          400: broxivaDesignTokens.colors.primary[400],
          500: broxivaDesignTokens.colors.primary[500],
          600: broxivaDesignTokens.colors.primary[600],
          700: broxivaDesignTokens.colors.primary[700],
          800: broxivaDesignTokens.colors.primary[800],
          900: broxivaDesignTokens.colors.primary[900],
          950: broxivaDesignTokens.colors.primary[950],
          DEFAULT: broxivaDesignTokens.colors.primary[800],
        },

        // Secondary colors
        secondary: {
          50: broxivaDesignTokens.colors.secondary[50],
          100: broxivaDesignTokens.colors.secondary[100],
          200: broxivaDesignTokens.colors.secondary[200],
          300: broxivaDesignTokens.colors.secondary[300],
          400: broxivaDesignTokens.colors.secondary[400],
          500: broxivaDesignTokens.colors.secondary[500],
          600: broxivaDesignTokens.colors.secondary[600],
          700: broxivaDesignTokens.colors.secondary[700],
          800: broxivaDesignTokens.colors.secondary[800],
          900: broxivaDesignTokens.colors.secondary[900],
          950: broxivaDesignTokens.colors.secondary[950],
          DEFAULT: broxivaDesignTokens.colors.secondary[500],
        },

        // Accent colors
        rose: {
          50: broxivaDesignTokens.colors.accent.rose[50],
          100: broxivaDesignTokens.colors.accent.rose[100],
          200: broxivaDesignTokens.colors.accent.rose[200],
          300: broxivaDesignTokens.colors.accent.rose[300],
          400: broxivaDesignTokens.colors.accent.rose[400],
          500: broxivaDesignTokens.colors.accent.rose[500],
          600: broxivaDesignTokens.colors.accent.rose[600],
          700: broxivaDesignTokens.colors.accent.rose[700],
          800: broxivaDesignTokens.colors.accent.rose[800],
          900: broxivaDesignTokens.colors.accent.rose[900],
        },

        emerald: {
          50: broxivaDesignTokens.colors.accent.emerald[50],
          100: broxivaDesignTokens.colors.accent.emerald[100],
          200: broxivaDesignTokens.colors.accent.emerald[200],
          300: broxivaDesignTokens.colors.accent.emerald[300],
          400: broxivaDesignTokens.colors.accent.emerald[400],
          500: broxivaDesignTokens.colors.accent.emerald[500],
          600: broxivaDesignTokens.colors.accent.emerald[600],
          700: broxivaDesignTokens.colors.accent.emerald[700],
          800: broxivaDesignTokens.colors.accent.emerald[800],
          900: broxivaDesignTokens.colors.accent.emerald[900],
        },

        sky: {
          50: broxivaDesignTokens.colors.accent.sky[50],
          100: broxivaDesignTokens.colors.accent.sky[100],
          200: broxivaDesignTokens.colors.accent.sky[200],
          300: broxivaDesignTokens.colors.accent.sky[300],
          400: broxivaDesignTokens.colors.accent.sky[400],
          500: broxivaDesignTokens.colors.accent.sky[500],
          600: broxivaDesignTokens.colors.accent.sky[600],
          700: broxivaDesignTokens.colors.accent.sky[700],
          800: broxivaDesignTokens.colors.accent.sky[800],
          900: broxivaDesignTokens.colors.accent.sky[900],
        },

        // Neutrals (renamed from slate to neutral)
        neutral: {
          0: broxivaDesignTokens.colors.neutral[0],
          50: broxivaDesignTokens.colors.neutral[50],
          100: broxivaDesignTokens.colors.neutral[100],
          200: broxivaDesignTokens.colors.neutral[200],
          300: broxivaDesignTokens.colors.neutral[300],
          400: broxivaDesignTokens.colors.neutral[400],
          500: broxivaDesignTokens.colors.neutral[500],
          600: broxivaDesignTokens.colors.neutral[600],
          700: broxivaDesignTokens.colors.neutral[700],
          800: broxivaDesignTokens.colors.neutral[800],
          900: broxivaDesignTokens.colors.neutral[900],
          950: broxivaDesignTokens.colors.neutral[950],
          1000: broxivaDesignTokens.colors.neutral[1000],
        },

        // Semantic colors
        success: {
          light: broxivaDesignTokens.colors.semantic.success.light,
          DEFAULT: broxivaDesignTokens.colors.semantic.success.DEFAULT,
          dark: broxivaDesignTokens.colors.semantic.success.dark,
        },

        warning: {
          light: broxivaDesignTokens.colors.semantic.warning.light,
          DEFAULT: broxivaDesignTokens.colors.semantic.warning.DEFAULT,
          dark: broxivaDesignTokens.colors.semantic.warning.dark,
        },

        error: {
          light: broxivaDesignTokens.colors.semantic.error.light,
          DEFAULT: broxivaDesignTokens.colors.semantic.error.DEFAULT,
          dark: broxivaDesignTokens.colors.semantic.error.dark,
        },

        info: {
          light: broxivaDesignTokens.colors.semantic.info.light,
          DEFAULT: broxivaDesignTokens.colors.semantic.info.DEFAULT,
          dark: broxivaDesignTokens.colors.semantic.info.dark,
        },
      },

      fontFamily: {
        display: broxivaDesignTokens.typography.fontFamily.display.split(','),
        sans: broxivaDesignTokens.typography.fontFamily.sans.split(','),
        mono: broxivaDesignTokens.typography.fontFamily.mono.split(','),
      },

      fontSize: {
        xs: [
          broxivaDesignTokens.typography.fontSize.xs.size,
          {
            lineHeight: broxivaDesignTokens.typography.fontSize.xs.lineHeight,
            letterSpacing: broxivaDesignTokens.typography.fontSize.xs.letterSpacing,
          },
        ],
        sm: [
          broxivaDesignTokens.typography.fontSize.sm.size,
          {
            lineHeight: broxivaDesignTokens.typography.fontSize.sm.lineHeight,
            letterSpacing: broxivaDesignTokens.typography.fontSize.sm.letterSpacing,
          },
        ],
        base: [
          broxivaDesignTokens.typography.fontSize.base.size,
          {
            lineHeight: broxivaDesignTokens.typography.fontSize.base.lineHeight,
            letterSpacing: broxivaDesignTokens.typography.fontSize.base.letterSpacing,
          },
        ],
        lg: [
          broxivaDesignTokens.typography.fontSize.lg.size,
          {
            lineHeight: broxivaDesignTokens.typography.fontSize.lg.lineHeight,
            letterSpacing: broxivaDesignTokens.typography.fontSize.lg.letterSpacing,
          },
        ],
        xl: [
          broxivaDesignTokens.typography.fontSize.xl.size,
          {
            lineHeight: broxivaDesignTokens.typography.fontSize.xl.lineHeight,
            letterSpacing: broxivaDesignTokens.typography.fontSize.xl.letterSpacing,
          },
        ],
        '2xl': [
          broxivaDesignTokens.typography.fontSize['2xl'].size,
          {
            lineHeight: broxivaDesignTokens.typography.fontSize['2xl'].lineHeight,
            letterSpacing: broxivaDesignTokens.typography.fontSize['2xl'].letterSpacing,
          },
        ],
        '3xl': [
          broxivaDesignTokens.typography.fontSize['3xl'].size,
          {
            lineHeight: broxivaDesignTokens.typography.fontSize['3xl'].lineHeight,
            letterSpacing: broxivaDesignTokens.typography.fontSize['3xl'].letterSpacing,
          },
        ],
        '4xl': [
          broxivaDesignTokens.typography.fontSize['4xl'].size,
          {
            lineHeight: broxivaDesignTokens.typography.fontSize['4xl'].lineHeight,
            letterSpacing: broxivaDesignTokens.typography.fontSize['4xl'].letterSpacing,
          },
        ],
        '5xl': [
          broxivaDesignTokens.typography.fontSize['5xl'].size,
          {
            lineHeight: broxivaDesignTokens.typography.fontSize['5xl'].lineHeight,
            letterSpacing: broxivaDesignTokens.typography.fontSize['5xl'].letterSpacing,
          },
        ],
        '6xl': [
          broxivaDesignTokens.typography.fontSize['6xl'].size,
          {
            lineHeight: broxivaDesignTokens.typography.fontSize['6xl'].lineHeight,
            letterSpacing: broxivaDesignTokens.typography.fontSize['6xl'].letterSpacing,
          },
        ],
        '7xl': [
          broxivaDesignTokens.typography.fontSize['7xl'].size,
          {
            lineHeight: broxivaDesignTokens.typography.fontSize['7xl'].lineHeight,
            letterSpacing: broxivaDesignTokens.typography.fontSize['7xl'].letterSpacing,
          },
        ],
        '8xl': [
          broxivaDesignTokens.typography.fontSize['8xl'].size,
          {
            lineHeight: broxivaDesignTokens.typography.fontSize['8xl'].lineHeight,
            letterSpacing: broxivaDesignTokens.typography.fontSize['8xl'].letterSpacing,
          },
        ],
      },

      spacing: broxivaDesignTokens.spacing,

      borderRadius: broxivaDesignTokens.borderRadius,

      boxShadow: {
        xs: broxivaDesignTokens.shadows.xs,
        sm: broxivaDesignTokens.shadows.sm,
        DEFAULT: broxivaDesignTokens.shadows.DEFAULT,
        md: broxivaDesignTokens.shadows.md,
        lg: broxivaDesignTokens.shadows.lg,
        xl: broxivaDesignTokens.shadows.xl,
        '2xl': broxivaDesignTokens.shadows['2xl'],
        inner: broxivaDesignTokens.shadows.inner,
        none: broxivaDesignTokens.shadows.none,
        // Premium shadows
        primary: broxivaDesignTokens.shadows.primary,
        'primary-lg': broxivaDesignTokens.shadows.primaryLg,
        secondary: broxivaDesignTokens.shadows.secondary,
        'secondary-lg': broxivaDesignTokens.shadows.secondaryLg,
        glass: broxivaDesignTokens.shadows.glass,
        focus: broxivaDesignTokens.shadows.focus,
        'focus-secondary': broxivaDesignTokens.shadows.focusSecondary,
      },

      transitionDuration: {
        instant: broxivaDesignTokens.animation.duration.instant,
        fast: broxivaDesignTokens.animation.duration.fast,
        normal: broxivaDesignTokens.animation.duration.normal,
        slow: broxivaDesignTokens.animation.duration.slow,
        slower: broxivaDesignTokens.animation.duration.slower,
        slowest: broxivaDesignTokens.animation.duration.slowest,
      },

      transitionTimingFunction: {
        linear: broxivaDesignTokens.animation.easing.linear,
        in: broxivaDesignTokens.animation.easing.easeIn,
        out: broxivaDesignTokens.animation.easing.easeOut,
        'in-out': broxivaDesignTokens.animation.easing.easeInOut,
        premium: broxivaDesignTokens.animation.easing.premium,
        smooth: broxivaDesignTokens.animation.easing.smooth,
        snappy: broxivaDesignTokens.animation.easing.snappy,
      },

      keyframes: broxivaDesignTokens.animation.keyframes,

      animation: {
        'fade-in': 'fadeIn 300ms ease-out',
        'fade-out': 'fadeOut 300ms ease-out',
        'slide-in-up': 'slideInUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-in-down': 'slideInDown 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-in-left': 'slideInLeft 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-in-right': 'slideInRight 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'scale-in': 'scaleIn 300ms ease-out',
        'scale-out': 'scaleOut 300ms ease-out',
        shimmer: 'shimmer 2s linear infinite',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        bounce: 'bounce 1s infinite',
        spin: 'spin 1s linear infinite',
      },

      zIndex: broxivaDesignTokens.zIndex,

      screens: {
        xs: broxivaDesignTokens.breakpoints.xs,
        sm: broxivaDesignTokens.breakpoints.sm,
        md: broxivaDesignTokens.breakpoints.md,
        lg: broxivaDesignTokens.breakpoints.lg,
        xl: broxivaDesignTokens.breakpoints.xl,
        '2xl': broxivaDesignTokens.breakpoints['2xl'],
        '3xl': broxivaDesignTokens.breakpoints['3xl'],
      },

      opacity: broxivaDesignTokens.opacity,
    },
  },
};

export default broxivaTailwindConfig;
