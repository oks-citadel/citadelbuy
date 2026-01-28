/**
 * Broxiva Design System - Main Export
 * Complete design system for luxury e-commerce
 */

// Export all design tokens
export * from './tokens';

// Re-export for convenience
export { colors, semanticColors } from './tokens/colors';
export { typography } from './tokens/typography';
export { spacing, semanticSpacing, containerWidth, componentSize } from './tokens/spacing';
export { shadows, semanticShadows } from './tokens/shadows';

// Export types
export type {
  ColorPalette,
  SemanticColors,
  Typography,
  FontSize,
  TextStyle,
  Spacing,
  SemanticSpacing,
  ContainerWidth,
  ComponentSize,
  Shadows,
  SemanticShadows,
} from './tokens';
