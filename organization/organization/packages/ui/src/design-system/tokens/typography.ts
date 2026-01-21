/**
 * Broxiva Design System - Typography Tokens
 * Premium typography scale for luxury e-commerce
 *
 * Font stack features:
 * - Playfair Display: Elegant serif for headings
 * - Inter: Modern sans-serif for body text
 * - System fonts as fallbacks for performance
 */

export const typography = {
  /**
   * FONT FAMILIES
   */
  fontFamily: {
    // Display font for hero sections and large headings
    display: '"Playfair Display", Georgia, "Times New Roman", serif',

    // Primary sans-serif for UI and body text
    sans: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',

    // Monospace for code and technical content
    mono: '"JetBrains Mono", "Fira Code", Consolas, "Courier New", monospace',
  },

  /**
   * FONT SIZES
   * Rem-based scale for accessibility (1rem = 16px default)
   * Includes responsive line-height and letter-spacing
   */
  fontSize: {
    xs: {
      size: '0.75rem', // 12px
      lineHeight: '1rem', // 16px
      letterSpacing: '0.025em',
      fontWeight: '400',
    },
    sm: {
      size: '0.875rem', // 14px
      lineHeight: '1.25rem', // 20px
      letterSpacing: '0.01em',
      fontWeight: '400',
    },
    base: {
      size: '1rem', // 16px
      lineHeight: '1.5rem', // 24px
      letterSpacing: '0',
      fontWeight: '400',
    },
    lg: {
      size: '1.125rem', // 18px
      lineHeight: '1.75rem', // 28px
      letterSpacing: '-0.01em',
      fontWeight: '400',
    },
    xl: {
      size: '1.25rem', // 20px
      lineHeight: '1.875rem', // 30px
      letterSpacing: '-0.015em',
      fontWeight: '500',
    },
    '2xl': {
      size: '1.5rem', // 24px
      lineHeight: '2rem', // 32px
      letterSpacing: '-0.02em',
      fontWeight: '600',
    },
    '3xl': {
      size: '1.875rem', // 30px
      lineHeight: '2.25rem', // 36px
      letterSpacing: '-0.025em',
      fontWeight: '600',
    },
    '4xl': {
      size: '2.25rem', // 36px
      lineHeight: '2.5rem', // 40px
      letterSpacing: '-0.03em',
      fontWeight: '700',
    },
    '5xl': {
      size: '3rem', // 48px
      lineHeight: '1.15',
      letterSpacing: '-0.035em',
      fontWeight: '700',
    },
    '6xl': {
      size: '3.75rem', // 60px
      lineHeight: '1.1',
      letterSpacing: '-0.04em',
      fontWeight: '700',
    },
    '7xl': {
      size: '4.5rem', // 72px
      lineHeight: '1.05',
      letterSpacing: '-0.045em',
      fontWeight: '800',
    },
    '8xl': {
      size: '6rem', // 96px
      lineHeight: '1',
      letterSpacing: '-0.05em',
      fontWeight: '800',
    },
  },

  /**
   * FONT WEIGHTS
   */
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

  /**
   * LINE HEIGHTS
   * Additional line-height values for custom use
   */
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },

  /**
   * LETTER SPACING
   */
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
    wider: '0.05em',
    widest: '0.1em',
  },

  /**
   * TEXT STYLES
   * Predefined combinations for common use cases
   */
  textStyles: {
    // Display styles (Playfair Display)
    displayLarge: {
      fontFamily: '"Playfair Display", Georgia, serif',
      fontSize: '6rem', // 96px
      lineHeight: '1',
      letterSpacing: '-0.05em',
      fontWeight: '800',
    },
    displayMedium: {
      fontFamily: '"Playfair Display", Georgia, serif',
      fontSize: '4.5rem', // 72px
      lineHeight: '1.05',
      letterSpacing: '-0.045em',
      fontWeight: '700',
    },
    displaySmall: {
      fontFamily: '"Playfair Display", Georgia, serif',
      fontSize: '3.75rem', // 60px
      lineHeight: '1.1',
      letterSpacing: '-0.04em',
      fontWeight: '700',
    },

    // Headings (Inter)
    h1: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '3rem', // 48px
      lineHeight: '1.15',
      letterSpacing: '-0.035em',
      fontWeight: '700',
    },
    h2: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '2.25rem', // 36px
      lineHeight: '2.5rem',
      letterSpacing: '-0.03em',
      fontWeight: '700',
    },
    h3: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '1.875rem', // 30px
      lineHeight: '2.25rem',
      letterSpacing: '-0.025em',
      fontWeight: '600',
    },
    h4: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '1.5rem', // 24px
      lineHeight: '2rem',
      letterSpacing: '-0.02em',
      fontWeight: '600',
    },
    h5: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '1.25rem', // 20px
      lineHeight: '1.875rem',
      letterSpacing: '-0.015em',
      fontWeight: '600',
    },
    h6: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '1.125rem', // 18px
      lineHeight: '1.75rem',
      letterSpacing: '-0.01em',
      fontWeight: '600',
    },

    // Body text
    bodyLarge: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '1.125rem', // 18px
      lineHeight: '1.75rem',
      letterSpacing: '0',
      fontWeight: '400',
    },
    body: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '1rem', // 16px
      lineHeight: '1.5rem',
      letterSpacing: '0',
      fontWeight: '400',
    },
    bodySmall: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '0.875rem', // 14px
      lineHeight: '1.25rem',
      letterSpacing: '0.01em',
      fontWeight: '400',
    },

    // Labels and captions
    label: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '0.875rem', // 14px
      lineHeight: '1.25rem',
      letterSpacing: '0.01em',
      fontWeight: '500',
    },
    caption: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '0.75rem', // 12px
      lineHeight: '1rem',
      letterSpacing: '0.025em',
      fontWeight: '400',
    },

    // Overline (small uppercase text)
    overline: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '0.75rem', // 12px
      lineHeight: '1rem',
      letterSpacing: '0.1em',
      fontWeight: '600',
      textTransform: 'uppercase',
    },

    // Button text
    button: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '0.875rem', // 14px
      lineHeight: '1.25rem',
      letterSpacing: '0.025em',
      fontWeight: '600',
    },
    buttonLarge: {
      fontFamily: '"Inter", sans-serif',
      fontSize: '1rem', // 16px
      lineHeight: '1.5rem',
      letterSpacing: '0.025em',
      fontWeight: '600',
    },
  },
} as const;

// Type exports
export type Typography = typeof typography;
export type FontSize = typeof typography.fontSize;
export type TextStyle = typeof typography.textStyles;

export default typography;
