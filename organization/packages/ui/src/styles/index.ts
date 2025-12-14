/**
 * Broxiva Design System - Main Export
 *
 * This file exports all design system tokens and utilities
 * for easy importing throughout the application.
 */

export { broxivaDesignTokens, default as designTokens } from './broxiva-design-tokens';
export type {
  BroxivaDesignTokens,
  ColorPalette,
  Typography,
  Spacing,
  BorderRadius,
  Shadows,
  Animation,
} from './broxiva-design-tokens';

// Re-export for convenience
export const tokens = broxivaDesignTokens;
