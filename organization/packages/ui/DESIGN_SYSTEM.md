# Broxiva Design System

> A premium, luxury design system for the Broxiva e-commerce platform

## Overview

The Broxiva Design System is a comprehensive set of design tokens, styles, and guidelines that create a cohesive, premium shopping experience. Built with accessibility, scalability, and luxury aesthetics in mind.

## Brand Identity

### Core Values
- **Premium**: High-end, luxury shopping experience
- **Modern**: Clean, contemporary design language
- **Sophisticated**: Refined typography and color choices
- **Accessible**: WCAG 2.1 AA compliant
- **Performant**: Optimized for speed and smooth animations

### Visual Language
- Deep purple/violet as primary brand color (#6B21A8)
- Gold accents for premium luxury feel (#F59E0B)
- Slate gray neutrals for modern sophistication
- High contrast ratios for accessibility
- Smooth, premium animations and transitions

## Design Tokens

### Colors

#### Primary (Deep Purple/Violet)
The primary color represents luxury, creativity, and premium quality.

```typescript
primary: {
  50: '#faf5ff',   // Lightest
  100: '#f3e8ff',
  200: '#e9d5ff',
  300: '#d8b4fe',
  400: '#c084fc',
  500: '#a855f7',
  600: '#9333ea',
  700: '#7e22ce',
  800: '#6b21a8',  // Main brand color
  900: '#581c87',
  950: '#3b0764',  // Darkest
}
```

**Usage:**
- Primary CTAs and buttons
- Links and interactive elements
- Brand highlights and accents
- Focus states

#### Secondary (Gold)
The secondary color conveys luxury, warmth, and premium value.

```typescript
secondary: {
  50: '#fffbeb',
  100: '#fef3c7',
  200: '#fde68a',
  300: '#fcd34d',
  400: '#fbbf24',
  500: '#f59e0b',  // Main gold accent
  600: '#d97706',
  700: '#b45309',
  800: '#92400e',
  900: '#78350f',
  950: '#451a03',
}
```

**Usage:**
- Premium badges and labels
- Sale/promotion highlights
- Secondary CTAs
- Success states and positive feedback

#### Neutrals (Slate Grays)
Modern, sophisticated neutrals for text and backgrounds.

```typescript
neutral: {
  0: '#ffffff',    // Pure white
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
  1000: '#000000', // Pure black
}
```

**Usage:**
- Text colors (900 for primary, 600 for secondary, 400 for tertiary)
- Backgrounds (0-100 for light mode, 800-950 for dark mode)
- Borders and dividers

#### Semantic Colors

```typescript
// Success (Green)
success: { light: '#d1fae5', DEFAULT: '#10b981', dark: '#065f46' }

// Warning (Amber)
warning: { light: '#fef3c7', DEFAULT: '#f59e0b', dark: '#92400e' }

// Error (Red)
error: { light: '#fee2e2', DEFAULT: '#ef4444', dark: '#991b1b' }

// Info (Blue)
info: { light: '#dbeafe', DEFAULT: '#3b82f6', dark: '#1e3a8a' }
```

### Typography

#### Font Families

**Display Font - Playfair Display**
Elegant serif font for headings and hero text.

```css
font-family: 'Playfair Display', Georgia, serif;
```

**UI Font - Inter**
Modern sans-serif for body text and UI elements.

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

**Monospace Font - JetBrains Mono**
For code snippets and technical content.

```css
font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
```

#### Type Scale

```typescript
fontSize: {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  base: '1rem',     // 16px
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '1.875rem',// 30px
  '4xl': '2.25rem', // 36px
  '5xl': '3rem',    // 48px
  '6xl': '3.75rem', // 60px
  '7xl': '4.5rem',  // 72px
  '8xl': '6rem',    // 96px
}
```

#### Font Weights

```typescript
fontWeight: {
  thin: 100,
  extralight: 200,
  light: 300,
  normal: 400,      // Body text
  medium: 500,      // Emphasis
  semibold: 600,    // Buttons, labels
  bold: 700,        // Headings
  extrabold: 800,
  black: 900,       // Hero text
}
```

### Spacing

4px-based spacing scale for consistent layout.

```typescript
spacing: {
  0: '0',
  px: '1px',
  0.5: '0.125rem',  // 2px
  1: '0.25rem',     // 4px
  2: '0.5rem',      // 8px
  3: '0.75rem',     // 12px
  4: '1rem',        // 16px
  5: '1.25rem',     // 20px
  6: '1.5rem',      // 24px
  8: '2rem',        // 32px
  10: '2.5rem',     // 40px
  12: '3rem',       // 48px
  16: '4rem',       // 64px
  20: '5rem',       // 80px
  24: '6rem',       // 96px
  // ... continues up to 96
}
```

### Border Radius

```typescript
borderRadius: {
  none: '0',
  sm: '0.125rem',   // 2px
  DEFAULT: '0.25rem', // 4px
  md: '0.375rem',   // 6px
  lg: '0.5rem',     // 8px
  xl: '0.75rem',    // 12px
  '2xl': '1rem',    // 16px
  '3xl': '1.5rem',  // 24px
  full: '9999px',   // Circle
}
```

### Shadows

Premium elevation system with colored shadows.

```typescript
// Basic shadows
xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)'
md: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)'
lg: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
xl: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
'2xl': '0 30px 60px -15px rgba(0, 0, 0, 0.3)'

// Premium colored shadows
primary: '0 10px 30px -5px rgba(107, 33, 168, 0.3)'
primaryLg: '0 20px 40px -10px rgba(107, 33, 168, 0.4)'
secondary: '0 10px 30px -5px rgba(245, 158, 11, 0.3)'

// Special effects
glass: '0 8px 32px 0 rgba(31, 38, 135, 0.37)'
focus: '0 0 0 3px rgba(107, 33, 168, 0.1)'
```

### Animations

Smooth, premium transitions and animations.

#### Duration
```typescript
duration: {
  instant: '75ms',
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
  slower: '700ms',
  slowest: '1000ms',
}
```

#### Easing
```typescript
easing: {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  premium: 'cubic-bezier(0.34, 1.56, 0.64, 1)',  // Bouncy
  smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)', // Smooth
  snappy: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', // Snappy
}
```

#### Keyframes
- fadeIn / fadeOut
- slideInUp / slideInDown / slideInLeft / slideInRight
- scaleIn / scaleOut
- shimmer
- pulse
- bounce
- spin
- glow

## Usage

### In TypeScript/JavaScript

```typescript
import { broxivaDesignTokens } from '@broxiva/ui/styles';

// Use tokens
const primaryColor = broxivaDesignTokens.colors.primary[800];
const spacing = broxivaDesignTokens.spacing[4];
const shadow = broxivaDesignTokens.shadows.primary;
```

### In CSS

```css
/* Import the theme */
@import '@broxiva/ui/styles/broxiva-theme.css';

/* Use CSS custom properties */
.button {
  background-color: var(--brx-color-primary);
  color: var(--brx-text-inverse);
  padding: var(--brx-spacing-3) var(--brx-spacing-6);
  border-radius: var(--brx-radius-lg);
  box-shadow: var(--brx-shadow-md);
  transition: all var(--brx-duration-fast) var(--brx-ease-out);
}

.button:hover {
  box-shadow: var(--brx-shadow-primary);
  transform: translateY(-2px);
}
```

### Global Styles

Import the global styles in your root layout:

```typescript
// app/layout.tsx
import '@/styles/broxiva-globals.css';
```

## Dark Mode

The design system includes comprehensive dark mode support.

### Automatic Dark Mode

Automatically switches based on user's system preference:

```css
@media (prefers-color-scheme: dark) {
  /* Dark mode styles automatically applied */
}
```

### Manual Dark Mode

Control dark mode manually with data attributes:

```html
<html data-theme="dark">
  <!-- Dark mode enabled -->
</html>

<html data-theme="light">
  <!-- Light mode enabled -->
</html>
```

### Toggle Implementation

```typescript
const [theme, setTheme] = useState<'light' | 'dark'>('light');

useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme);
}, [theme]);

const toggleTheme = () => {
  setTheme(prev => prev === 'light' ? 'dark' : 'light');
};
```

## Component Guidelines

### Buttons

```css
.btn-primary {
  background: var(--brx-color-primary);
  color: var(--brx-text-inverse);
  padding: var(--brx-spacing-3) var(--brx-spacing-6);
  border-radius: var(--brx-radius-lg);
  font-weight: var(--brx-font-semibold);
  transition: all var(--brx-duration-fast) var(--brx-ease-out);
}

.btn-primary:hover {
  background: var(--brx-color-primary-900);
  box-shadow: var(--brx-shadow-primary);
  transform: translateY(-2px);
}
```

### Cards

```css
.card {
  background: var(--brx-bg-primary);
  border-radius: var(--brx-radius-2xl);
  box-shadow: var(--brx-shadow-md);
  padding: var(--brx-spacing-6);
  transition: all var(--brx-duration-normal) var(--brx-ease-out);
}

.card:hover {
  box-shadow: var(--brx-shadow-lg);
  transform: translateY(-2px);
}
```

### Glass Morphism

```css
.glass-card {
  background: var(--brx-bg-glass);
  backdrop-filter: blur(12px);
  box-shadow: var(--brx-shadow-glass);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: var(--brx-radius-2xl);
}
```

## Accessibility

### Color Contrast

All color combinations meet WCAG 2.1 AA standards:
- Primary on white: 7.5:1
- Text primary on background: 14:1
- Text secondary on background: 7:1

### Focus States

Visible focus indicators for keyboard navigation:

```css
:focus-visible {
  outline: 2px solid var(--brx-border-focus);
  outline-offset: 2px;
  border-radius: var(--brx-radius-sm);
}
```

### Reduced Motion

Respects user's motion preferences:

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Screen Reader Support

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}
```

## Responsive Design

### Breakpoints

```typescript
breakpoints: {
  xs: '320px',   // Mobile small
  sm: '640px',   // Mobile
  md: '768px',   // Tablet
  lg: '1024px',  // Desktop
  xl: '1280px',  // Desktop large
  '2xl': '1536px', // Desktop XL
  '3xl': '1920px', // Ultra-wide
}
```

### Usage

```css
/* Mobile first approach */
.container {
  padding: var(--brx-spacing-4);
}

@media (min-width: 768px) {
  .container {
    padding: var(--brx-spacing-6);
  }
}

@media (min-width: 1024px) {
  .container {
    padding: var(--brx-spacing-8);
  }
}
```

## Premium Effects

### Hover Lift

```css
.hover-lift {
  transition: transform var(--brx-duration-normal) var(--brx-ease-premium);
}

.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: var(--brx-shadow-lg);
}
```

### Shimmer Loading

```css
.shimmer {
  background: linear-gradient(
    90deg,
    var(--brx-bg-secondary) 0%,
    var(--brx-bg-tertiary) 50%,
    var(--brx-bg-secondary) 100%
  );
  background-size: 200% 100%;
  animation: brx-shimmer 2s ease-in-out infinite;
}
```

### Text Gradient

```css
.text-gradient {
  background: linear-gradient(
    135deg,
    var(--brx-color-primary-600) 0%,
    var(--brx-color-secondary-500) 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

## Best Practices

### Do's ✅

- Use design tokens for all styling
- Maintain consistent spacing (multiples of 4px)
- Follow the type scale for font sizes
- Use semantic color names
- Implement smooth transitions
- Test in both light and dark modes
- Ensure keyboard accessibility
- Test with screen readers

### Don'ts ❌

- Don't use arbitrary values
- Don't skip the type scale
- Don't use colors outside the palette
- Don't forget focus states
- Don't ignore reduced motion preferences
- Don't hardcode spacing values
- Don't use low contrast colors

## File Structure

```
packages/ui/src/styles/
├── broxiva-design-tokens.ts  # Token definitions
├── broxiva-theme.css         # CSS variables
└── index.ts                  # Exports

apps/web/styles/
└── broxiva-globals.css       # Global styles
```

## Contributing

When adding new tokens:

1. Follow naming conventions
2. Update TypeScript types
3. Add CSS custom properties
4. Document usage examples
5. Test in light and dark modes
6. Ensure accessibility compliance

## Version History

- **v1.0.0** - Initial Broxiva design system
  - Premium color palette (purple + gold)
  - Typography scale (Playfair Display + Inter)
  - Complete dark mode support
  - Accessibility features
  - Premium animations

## Support

For questions or issues with the design system:
- Create an issue in the repository
- Contact the design team
- Reference this documentation

---

**Built with care for Broxiva** - A premium e-commerce experience
