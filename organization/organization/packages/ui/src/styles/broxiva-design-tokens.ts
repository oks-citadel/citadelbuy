/**
 * Broxiva Design System - Design Tokens
 * Premium E-commerce Platform
 *
 * This file contains all design tokens for the Broxiva brand.
 * These tokens are the foundation of our design system and ensure
 * consistency across all touchpoints.
 */

export const broxivaDesignTokens = {
  /**
   * COLOR PALETTE
   * Premium luxury color system with accessibility in mind
   */
  colors: {
    // Primary - Deep Purple/Violet (Brand Identity)
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
    },

    // Secondary - Gold Accent (Luxury & Premium)
    secondary: {
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
      950: '#451a03',
    },

    // Accent - Complementary colors
    accent: {
      rose: {
        50: '#fff1f2',
        100: '#ffe4e6',
        200: '#fecdd3',
        300: '#fda4af',
        400: '#fb7185',
        500: '#f43f5e',
        600: '#e11d48',
        700: '#be123c',
        800: '#9f1239',
        900: '#881337',
      },
      emerald: {
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
      },
      sky: {
        50: '#f0f9ff',
        100: '#e0f2fe',
        200: '#bae6fd',
        300: '#7dd3fc',
        400: '#38bdf8',
        500: '#0ea5e9',
        600: '#0284c7',
        700: '#0369a1',
        800: '#075985',
        900: '#0c4a6e',
      },
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
      1000: '#000000',
    },

    // Semantic colors
    semantic: {
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

    // Background colors
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
      overlay: 'rgba(15, 23, 42, 0.5)',
      glass: 'rgba(255, 255, 255, 0.8)',
    },

    // Text colors
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      tertiary: '#94a3b8',
      disabled: '#cbd5e1',
      inverse: '#ffffff',
      link: '#6b21a8',
      linkHover: '#581c87',
    },

    // Border colors
    border: {
      light: '#e2e8f0',
      DEFAULT: '#cbd5e1',
      dark: '#94a3b8',
      focus: '#6b21a8',
      error: '#ef4444',
    },
  },

  /**
   * TYPOGRAPHY
   * Hierarchical type scale for premium reading experience
   */
  typography: {
    // Font families
    fontFamily: {
      display: '"Playfair Display", Georgia, serif', // For headings & hero text
      sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', // For UI & body
      mono: '"JetBrains Mono", "Fira Code", Consolas, monospace', // For code
    },

    // Font sizes (rem-based for accessibility)
    fontSize: {
      xs: {
        size: '0.75rem', // 12px
        lineHeight: '1rem', // 16px
        letterSpacing: '0.025em',
      },
      sm: {
        size: '0.875rem', // 14px
        lineHeight: '1.25rem', // 20px
        letterSpacing: '0.01em',
      },
      base: {
        size: '1rem', // 16px
        lineHeight: '1.5rem', // 24px
        letterSpacing: '0',
      },
      lg: {
        size: '1.125rem', // 18px
        lineHeight: '1.75rem', // 28px
        letterSpacing: '-0.01em',
      },
      xl: {
        size: '1.25rem', // 20px
        lineHeight: '1.875rem', // 30px
        letterSpacing: '-0.015em',
      },
      '2xl': {
        size: '1.5rem', // 24px
        lineHeight: '2rem', // 32px
        letterSpacing: '-0.02em',
      },
      '3xl': {
        size: '1.875rem', // 30px
        lineHeight: '2.25rem', // 36px
        letterSpacing: '-0.025em',
      },
      '4xl': {
        size: '2.25rem', // 36px
        lineHeight: '2.5rem', // 40px
        letterSpacing: '-0.03em',
      },
      '5xl': {
        size: '3rem', // 48px
        lineHeight: '1.15',
        letterSpacing: '-0.035em',
      },
      '6xl': {
        size: '3.75rem', // 60px
        lineHeight: '1.1',
        letterSpacing: '-0.04em',
      },
      '7xl': {
        size: '4.5rem', // 72px
        lineHeight: '1.05',
        letterSpacing: '-0.045em',
      },
      '8xl': {
        size: '6rem', // 96px
        lineHeight: '1',
        letterSpacing: '-0.05em',
      },
    },

    // Font weights
    fontWeight: {
      thin: '100',
      extralight: '200',
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
      black: '900',
    },
  },

  /**
   * SPACING SYSTEM
   * Consistent 4px-based spacing scale
   */
  spacing: {
    0: '0',
    px: '1px',
    0.5: '0.125rem', // 2px
    1: '0.25rem', // 4px
    1.5: '0.375rem', // 6px
    2: '0.5rem', // 8px
    2.5: '0.625rem', // 10px
    3: '0.75rem', // 12px
    3.5: '0.875rem', // 14px
    4: '1rem', // 16px
    5: '1.25rem', // 20px
    6: '1.5rem', // 24px
    7: '1.75rem', // 28px
    8: '2rem', // 32px
    9: '2.25rem', // 36px
    10: '2.5rem', // 40px
    11: '2.75rem', // 44px
    12: '3rem', // 48px
    14: '3.5rem', // 56px
    16: '4rem', // 64px
    20: '5rem', // 80px
    24: '6rem', // 96px
    28: '7rem', // 112px
    32: '8rem', // 128px
    36: '9rem', // 144px
    40: '10rem', // 160px
    44: '11rem', // 176px
    48: '12rem', // 192px
    52: '13rem', // 208px
    56: '14rem', // 224px
    60: '15rem', // 240px
    64: '16rem', // 256px
    72: '18rem', // 288px
    80: '20rem', // 320px
    96: '24rem', // 384px
  },

  /**
   * BORDER RADIUS
   * Rounded corners for modern, premium feel
   */
  borderRadius: {
    none: '0',
    sm: '0.125rem', // 2px
    DEFAULT: '0.25rem', // 4px
    md: '0.375rem', // 6px
    lg: '0.5rem', // 8px
    xl: '0.75rem', // 12px
    '2xl': '1rem', // 16px
    '3xl': '1.5rem', // 24px
    full: '9999px',
  },

  /**
   * SHADOWS
   * Layered elevation system for depth and hierarchy
   */
  shadows: {
    // Elevation shadows
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    DEFAULT: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    md: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    lg: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    xl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    '2xl': '0 30px 60px -15px rgba(0, 0, 0, 0.3)',

    // Colored shadows for premium effect
    primary: '0 10px 30px -5px rgba(107, 33, 168, 0.3)',
    primaryLg: '0 20px 40px -10px rgba(107, 33, 168, 0.4)',
    secondary: '0 10px 30px -5px rgba(245, 158, 11, 0.3)',
    secondaryLg: '0 20px 40px -10px rgba(245, 158, 11, 0.4)',

    // Inner shadow
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',

    // Focus ring
    focus: '0 0 0 3px rgba(107, 33, 168, 0.1)',
    focusSecondary: '0 0 0 3px rgba(245, 158, 11, 0.1)',

    // Glass effect
    glass: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',

    // No shadow
    none: 'none',
  },

  /**
   * ANIMATIONS
   * Smooth, premium transitions and animations
   */
  animation: {
    // Duration
    duration: {
      instant: '75ms',
      fast: '150ms',
      normal: '300ms',
      slow: '500ms',
      slower: '700ms',
      slowest: '1000ms',
    },

    // Timing functions (easing)
    easing: {
      linear: 'linear',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',

      // Premium custom easing
      premium: 'cubic-bezier(0.34, 1.56, 0.64, 1)', // Bouncy
      smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Smooth
      snappy: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Snappy
    },

    // Keyframes
    keyframes: {
      fadeIn: {
        from: { opacity: '0' },
        to: { opacity: '1' },
      },
      fadeOut: {
        from: { opacity: '1' },
        to: { opacity: '0' },
      },
      slideInUp: {
        from: { transform: 'translateY(100%)', opacity: '0' },
        to: { transform: 'translateY(0)', opacity: '1' },
      },
      slideInDown: {
        from: { transform: 'translateY(-100%)', opacity: '0' },
        to: { transform: 'translateY(0)', opacity: '1' },
      },
      slideInLeft: {
        from: { transform: 'translateX(-100%)', opacity: '0' },
        to: { transform: 'translateX(0)', opacity: '1' },
      },
      slideInRight: {
        from: { transform: 'translateX(100%)', opacity: '0' },
        to: { transform: 'translateX(0)', opacity: '1' },
      },
      scaleIn: {
        from: { transform: 'scale(0.95)', opacity: '0' },
        to: { transform: 'scale(1)', opacity: '1' },
      },
      scaleOut: {
        from: { transform: 'scale(1)', opacity: '1' },
        to: { transform: 'scale(0.95)', opacity: '0' },
      },
      shimmer: {
        '0%': { backgroundPosition: '-1000px 0' },
        '100%': { backgroundPosition: '1000px 0' },
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
  },

  /**
   * BREAKPOINTS
   * Responsive design breakpoints
   */
  breakpoints: {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
    '3xl': '1920px',
  },

  /**
   * Z-INDEX SYSTEM
   * Layering hierarchy
   */
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
    notification: 1080,
    maximum: 9999,
  },

  /**
   * SIZING
   * Common size tokens for components
   */
  sizing: {
    icon: {
      xs: '1rem', // 16px
      sm: '1.25rem', // 20px
      md: '1.5rem', // 24px
      lg: '2rem', // 32px
      xl: '2.5rem', // 40px
      '2xl': '3rem', // 48px
    },
    button: {
      sm: '2rem', // 32px
      md: '2.5rem', // 40px
      lg: '3rem', // 48px
      xl: '3.5rem', // 56px
    },
    input: {
      sm: '2rem', // 32px
      md: '2.5rem', // 40px
      lg: '3rem', // 48px
    },
    avatar: {
      xs: '1.5rem', // 24px
      sm: '2rem', // 32px
      md: '2.5rem', // 40px
      lg: '3rem', // 48px
      xl: '4rem', // 64px
      '2xl': '6rem', // 96px
    },
  },

  /**
   * OPACITY
   * Transparency levels
   */
  opacity: {
    0: '0',
    5: '0.05',
    10: '0.1',
    20: '0.2',
    30: '0.3',
    40: '0.4',
    50: '0.5',
    60: '0.6',
    70: '0.7',
    80: '0.8',
    90: '0.9',
    95: '0.95',
    100: '1',
  },
} as const;

// Type exports for TypeScript
export type BroxivaDesignTokens = typeof broxivaDesignTokens;
export type ColorPalette = typeof broxivaDesignTokens.colors;
export type Typography = typeof broxivaDesignTokens.typography;
export type Spacing = typeof broxivaDesignTokens.spacing;
export type BorderRadius = typeof broxivaDesignTokens.borderRadius;
export type Shadows = typeof broxivaDesignTokens.shadows;
export type Animation = typeof broxivaDesignTokens.animation;

// Export default
export default broxivaDesignTokens;
