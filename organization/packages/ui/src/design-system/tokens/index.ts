/**
 * Broxiva Design System - Design Tokens Index
 * Centralized export for all design tokens
 */

export { colors, semanticColors, type ColorPalette, type SemanticColors } from './colors';
export { typography, type Typography, type FontSize, type TextStyle } from './typography';
export { spacing, semanticSpacing, containerWidth, componentSize, type Spacing, type SemanticSpacing, type ContainerWidth, type ComponentSize } from './spacing';
export { shadows, semanticShadows, type Shadows, type SemanticShadows } from './shadows';

/**
 * Consolidated design tokens object
 */
export const designTokens = {
  colors: require('./colors').colors,
  semanticColors: require('./colors').semanticColors,
  typography: require('./typography').typography,
  spacing: require('./spacing').spacing,
  semanticSpacing: require('./spacing').semanticSpacing,
  containerWidth: require('./spacing').containerWidth,
  componentSize: require('./spacing').componentSize,
  shadows: require('./shadows').shadows,
  semanticShadows: require('./shadows').semanticShadows,
} as const;

export default designTokens;
