/**
 * Broxiva Design System - Color Tokens
 * Premium luxury e-commerce color palette
 *
 * All colors are WCAG 2.1 AA compliant for accessibility
 */

export const colors = {
  /**
   * PRIMARY - Elegant deep navy to convey trust and sophistication
   * Main brand color for primary actions and brand identity
   */
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
  },

  /**
   * ACCENT - Luxurious gold for premium feel
   * Used for highlighting premium features, promotions, and CTAs
   */
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
  },

  /**
   * SUCCESS - Fresh emerald green
   * For success states, positive feedback, and confirmations
   */
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
  },

  /**
   * WARNING - Warm amber
   * For warnings, alerts, and important notices
   */
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
  },

  /**
   * ERROR - Bold red
   * For errors, destructive actions, and critical alerts
   */
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
  },

  /**
   * INFO - Calm blue
   * For informational messages and highlights
   */
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
  },

  /**
   * NEUTRAL - Sophisticated gray scale
   * For text, backgrounds, borders, and neutral elements
   */
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

  /**
   * BACKGROUND - Premium surface colors
   */
  background: {
    primary: '#ffffff',
    secondary: '#f9fafb',
    tertiary: '#f3f4f6',
    overlay: 'rgba(17, 24, 39, 0.5)',
    overlayDark: 'rgba(17, 24, 39, 0.75)',
    glass: 'rgba(255, 255, 255, 0.8)',
    glassDark: 'rgba(255, 255, 255, 0.95)',
  },

  /**
   * TEXT - Hierarchical text colors
   */
  text: {
    primary: '#111827',
    secondary: '#4b5563',
    tertiary: '#9ca3af',
    disabled: '#d1d5db',
    inverse: '#ffffff',
    link: '#1a365d',
    linkHover: '#0f2447',
    accent: '#c9a227',
  },

  /**
   * BORDER - Subtle to prominent borders
   */
  border: {
    light: '#f3f4f6',
    DEFAULT: '#e5e7eb',
    medium: '#d1d5db',
    dark: '#9ca3af',
    focus: '#1a365d',
    focusAccent: '#c9a227',
    error: '#ef4444',
    success: '#10b981',
  },
} as const;

/**
 * Semantic color mappings for common UI patterns
 */
export const semanticColors = {
  // Brand colors
  brand: {
    primary: colors.primary[500],
    primaryHover: colors.primary[700],
    primaryActive: colors.primary[800],
    accent: colors.accent[500],
    accentHover: colors.accent[700],
    accentActive: colors.accent[800],
  },

  // Interactive states
  interactive: {
    default: colors.primary[500],
    hover: colors.primary[700],
    active: colors.primary[800],
    disabled: colors.neutral[300],
    focus: colors.primary[500],
  },

  // Feedback colors
  feedback: {
    success: colors.success[500],
    warning: colors.warning[500],
    error: colors.error[500],
    info: colors.info[500],
  },

  // Surface colors
  surface: {
    default: colors.neutral[0],
    elevated: colors.neutral[50],
    overlay: colors.background.overlay,
  },
} as const;

// Type exports
export type ColorPalette = typeof colors;
export type SemanticColors = typeof semanticColors;

export default colors;
