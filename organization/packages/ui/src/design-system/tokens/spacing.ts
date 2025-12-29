/**
 * Broxiva Design System - Spacing Tokens
 * 8px base spacing system for consistent layouts
 *
 * Base unit: 8px
 * All spacing values are multiples or fractions of 8px
 * Uses rem units for accessibility (1rem = 16px default)
 */

export const spacing = {
  /**
   * SPACING SCALE
   * Based on 8px grid system
   */
  0: '0',
  px: '1px',

  // Micro spacing (sub-8px)
  0.5: '0.125rem', // 2px
  1: '0.25rem', // 4px
  1.5: '0.375rem', // 6px

  // Base spacing (8px increments)
  2: '0.5rem', // 8px - Base unit
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
  18: '4.5rem', // 72px
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
} as const;

/**
 * SEMANTIC SPACING
 * Named spacing values for specific use cases
 */
export const semanticSpacing = {
  // Component internal spacing
  component: {
    xs: spacing[1], // 4px
    sm: spacing[2], // 8px
    md: spacing[4], // 16px
    lg: spacing[6], // 24px
    xl: spacing[8], // 32px
  },

  // Content spacing (between elements)
  content: {
    xs: spacing[2], // 8px
    sm: spacing[4], // 16px
    md: spacing[6], // 24px
    lg: spacing[8], // 32px
    xl: spacing[12], // 48px
    '2xl': spacing[16], // 64px
  },

  // Section spacing (between major sections)
  section: {
    sm: spacing[12], // 48px
    md: spacing[16], // 64px
    lg: spacing[24], // 96px
    xl: spacing[32], // 128px
    '2xl': spacing[40], // 160px
  },

  // Layout spacing (page margins and containers)
  layout: {
    xs: spacing[4], // 16px
    sm: spacing[6], // 24px
    md: spacing[8], // 32px
    lg: spacing[12], // 48px
    xl: spacing[16], // 64px
  },

  // Gutter spacing (grid gaps)
  gutter: {
    xs: spacing[2], // 8px
    sm: spacing[4], // 16px
    md: spacing[6], // 24px
    lg: spacing[8], // 32px
    xl: spacing[12], // 48px
  },
} as const;

/**
 * CONTAINER WIDTHS
 * Maximum widths for content containers
 */
export const containerWidth = {
  xs: '20rem', // 320px
  sm: '24rem', // 384px
  md: '28rem', // 448px
  lg: '32rem', // 512px
  xl: '36rem', // 576px
  '2xl': '42rem', // 672px
  '3xl': '48rem', // 768px
  '4xl': '56rem', // 896px
  '5xl': '64rem', // 1024px
  '6xl': '72rem', // 1152px
  '7xl': '80rem', // 1280px
  full: '100%',
  screen: '100vw',
} as const;

/**
 * COMPONENT SIZING
 * Standard sizes for common components
 */
export const componentSize = {
  // Button heights
  button: {
    sm: spacing[8], // 32px
    md: spacing[10], // 40px
    lg: spacing[12], // 48px
    xl: spacing[14], // 56px
  },

  // Input heights
  input: {
    sm: spacing[8], // 32px
    md: spacing[10], // 40px
    lg: spacing[12], // 48px
  },

  // Icon sizes
  icon: {
    xs: spacing[4], // 16px
    sm: spacing[5], // 20px
    md: spacing[6], // 24px
    lg: spacing[8], // 32px
    xl: spacing[10], // 40px
    '2xl': spacing[12], // 48px
  },

  // Avatar sizes
  avatar: {
    xs: spacing[6], // 24px
    sm: spacing[8], // 32px
    md: spacing[10], // 40px
    lg: spacing[12], // 48px
    xl: spacing[16], // 64px
    '2xl': spacing[24], // 96px
  },

  // Badge sizes
  badge: {
    sm: spacing[4], // 16px
    md: spacing[5], // 20px
    lg: spacing[6], // 24px
  },
} as const;

// Type exports
export type Spacing = typeof spacing;
export type SemanticSpacing = typeof semanticSpacing;
export type ContainerWidth = typeof containerWidth;
export type ComponentSize = typeof componentSize;

export default spacing;
