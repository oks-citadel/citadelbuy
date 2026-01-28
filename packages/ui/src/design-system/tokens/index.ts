/**
 * Broxiva Design System - Design Tokens Index
 * Centralized export for all design tokens
 */

import { colors, semanticColors } from './colors';
import type { ColorPalette, SemanticColors } from './colors';
export { colors, semanticColors, type ColorPalette, type SemanticColors };

import { typography } from './typography';
import type { Typography, FontSize, TextStyle } from './typography';
export { typography, type Typography, type FontSize, type TextStyle };

import { spacing, semanticSpacing, containerWidth, componentSize } from './spacing';
import type { Spacing, SemanticSpacing, ContainerWidth, ComponentSize } from './spacing';
export { spacing, semanticSpacing, containerWidth, componentSize, type Spacing, type SemanticSpacing, type ContainerWidth, type ComponentSize };

import { shadows, semanticShadows } from './shadows';
import type { Shadows, SemanticShadows } from './shadows';
export { shadows, semanticShadows, type Shadows, type SemanticShadows };

/**
 * Consolidated design tokens object
 */
export const designTokens = {
  colors,
  semanticColors,
  typography,
  spacing,
  semanticSpacing,
  containerWidth,
  componentSize,
  shadows,
  semanticShadows,
} as const;

export default designTokens;
