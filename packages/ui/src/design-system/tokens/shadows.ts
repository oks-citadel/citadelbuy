/**
 * Broxiva Design System - Shadow Tokens
 * Elevation system for depth and visual hierarchy
 *
 * Shadow layers:
 * - Subtle shadows for cards and containers
 * - Prominent shadows for modals and overlays
 * - Colored shadows for brand elements
 * - Inner shadows for inputs and depressed states
 */

export const shadows = {
  /**
   * ELEVATION SHADOWS
   * Progressive elevation from flat to floating
   */

  // No shadow (flush with background)
  none: 'none',

  // Extra small - Subtle lift (1-2px)
  xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',

  // Small - Cards at rest (2-4px)
  sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',

  // Default - Hoverable cards (4-8px)
  DEFAULT: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',

  // Medium - Dropdowns, popovers (8-16px)
  md: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',

  // Large - Modals, drawers (16-24px)
  lg: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',

  // Extra large - Prominent modals (24-32px)
  xl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',

  // 2X large - Maximum elevation (32px+)
  '2xl': '0 30px 60px -15px rgba(0, 0, 0, 0.3)',

  /**
   * COLORED SHADOWS
   * Premium brand-colored shadows for special elements
   */

  // Primary brand shadows (deep navy)
  primary: '0 10px 30px -5px rgba(26, 54, 93, 0.3)',
  primaryHover: '0 15px 35px -5px rgba(26, 54, 93, 0.4)',
  primaryLg: '0 20px 40px -10px rgba(26, 54, 93, 0.4)',

  // Accent shadows (gold)
  accent: '0 10px 30px -5px rgba(201, 162, 39, 0.3)',
  accentHover: '0 15px 35px -5px rgba(201, 162, 39, 0.4)',
  accentLg: '0 20px 40px -10px rgba(201, 162, 39, 0.4)',

  // Success shadows (green)
  success: '0 8px 24px -4px rgba(16, 185, 129, 0.25)',

  // Error shadows (red)
  error: '0 8px 24px -4px rgba(239, 68, 68, 0.25)',

  // Warning shadows (amber)
  warning: '0 8px 24px -4px rgba(245, 158, 11, 0.25)',

  /**
   * INNER SHADOWS
   * For depressed/inset elements
   */

  // Subtle inner shadow
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',

  // Prominent inner shadow
  innerLg: 'inset 0 4px 8px 0 rgba(0, 0, 0, 0.1)',

  /**
   * FOCUS RINGS
   * For keyboard navigation and focus states
   */

  // Primary focus ring
  focus: '0 0 0 3px rgba(26, 54, 93, 0.1)',
  focusMd: '0 0 0 4px rgba(26, 54, 93, 0.15)',
  focusLg: '0 0 0 5px rgba(26, 54, 93, 0.2)',

  // Accent focus ring
  focusAccent: '0 0 0 3px rgba(201, 162, 39, 0.1)',
  focusAccentMd: '0 0 0 4px rgba(201, 162, 39, 0.15)',

  // Error focus ring
  focusError: '0 0 0 3px rgba(239, 68, 68, 0.1)',

  /**
   * GLASS MORPHISM
   * Modern frosted glass effect
   */

  // Light glass effect
  glass: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',

  // Prominent glass effect
  glassLg: '0 12px 40px 0 rgba(31, 38, 135, 0.25)',

  /**
   * GLOW EFFECTS
   * Soft glowing shadows for premium elements
   */

  // Subtle glow
  glow: '0 0 20px rgba(26, 54, 93, 0.15)',

  // Medium glow
  glowMd: '0 0 30px rgba(26, 54, 93, 0.25)',

  // Large glow
  glowLg: '0 0 40px rgba(26, 54, 93, 0.35)',

  // Accent glow (gold)
  glowAccent: '0 0 20px rgba(201, 162, 39, 0.15)',
  glowAccentMd: '0 0 30px rgba(201, 162, 39, 0.25)',
  glowAccentLg: '0 0 40px rgba(201, 162, 39, 0.35)',
} as const;

/**
 * SEMANTIC SHADOWS
 * Named shadow combinations for specific use cases
 */
export const semanticShadows = {
  // Interactive elements
  interactive: {
    rest: shadows.sm,
    hover: shadows.md,
    active: shadows.xs,
    disabled: shadows.none,
  },

  // Cards
  card: {
    flat: shadows.none,
    resting: shadows.sm,
    elevated: shadows.DEFAULT,
    hovering: shadows.md,
  },

  // Overlays
  overlay: {
    dropdown: shadows.md,
    modal: shadows.lg,
    drawer: shadows.xl,
    tooltip: shadows.DEFAULT,
  },

  // Premium elements
  premium: {
    product: shadows.primaryLg,
    hero: shadows.glowLg,
    cta: shadows.accentLg,
  },
} as const;

// Type exports
export type Shadows = typeof shadows;
export type SemanticShadows = typeof semanticShadows;

export default shadows;
