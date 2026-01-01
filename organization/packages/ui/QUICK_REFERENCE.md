# Broxiva Design System - Quick Reference Card

## Color Variables

### Primary (Purple)
```css
var(--brx-color-primary)         /* #6b21a8 */
var(--brx-color-primary-50)      /* Lightest */
var(--brx-color-primary-900)     /* Darkest */
```

### Secondary (Gold)
```css
var(--brx-color-secondary)       /* #f59e0b */
var(--brx-color-secondary-50)    /* Lightest */
var(--brx-color-secondary-900)   /* Darkest */
```

### Neutrals
```css
var(--brx-color-neutral-0)       /* White */
var(--brx-color-neutral-900)     /* Almost black */
```

### Text Colors
```css
var(--brx-text-primary)          /* Main text */
var(--brx-text-secondary)        /* Secondary text */
var(--brx-text-tertiary)         /* Subtle text */
var(--brx-text-inverse)          /* White text */
var(--brx-text-link)             /* Link color */
```

### Backgrounds
```css
var(--brx-bg-primary)            /* Main background */
var(--brx-bg-secondary)          /* Secondary background */
var(--brx-bg-tertiary)           /* Tertiary background */
var(--brx-bg-glass)              /* Glass morphism */
```

### Semantic
```css
var(--brx-color-success)
var(--brx-color-warning)
var(--brx-color-error)
var(--brx-color-info)
```

## Typography

### Font Families
```css
var(--brx-font-display)          /* Playfair Display */
var(--brx-font-sans)             /* Inter */
var(--brx-font-mono)             /* JetBrains Mono */
```

### Font Sizes
```css
var(--brx-text-xs)               /* 12px */
var(--brx-text-sm)               /* 14px */
var(--brx-text-base)             /* 16px */
var(--brx-text-lg)               /* 18px */
var(--brx-text-xl)               /* 20px */
var(--brx-text-2xl)              /* 24px */
var(--brx-text-3xl)              /* 30px */
var(--brx-text-4xl)              /* 36px */
var(--brx-text-5xl)              /* 48px */
var(--brx-text-6xl)              /* 60px */
```

### Font Weights
```css
var(--brx-font-light)            /* 300 */
var(--brx-font-normal)           /* 400 */
var(--brx-font-medium)           /* 500 */
var(--brx-font-semibold)         /* 600 */
var(--brx-font-bold)             /* 700 */
var(--brx-font-black)            /* 900 */
```

## Spacing

```css
var(--brx-spacing-1)             /* 4px */
var(--brx-spacing-2)             /* 8px */
var(--brx-spacing-3)             /* 12px */
var(--brx-spacing-4)             /* 16px */
var(--brx-spacing-6)             /* 24px */
var(--brx-spacing-8)             /* 32px */
var(--brx-spacing-12)            /* 48px */
var(--brx-spacing-16)            /* 64px */
```

## Border Radius

```css
var(--brx-radius-sm)             /* 2px */
var(--brx-radius)                /* 4px */
var(--brx-radius-md)             /* 6px */
var(--brx-radius-lg)             /* 8px */
var(--brx-radius-xl)             /* 12px */
var(--brx-radius-2xl)            /* 16px */
var(--brx-radius-3xl)            /* 24px */
var(--brx-radius-full)           /* Circle */
```

## Shadows

```css
var(--brx-shadow-xs)
var(--brx-shadow-sm)
var(--brx-shadow)                /* Default */
var(--brx-shadow-md)
var(--brx-shadow-lg)
var(--brx-shadow-xl)
var(--brx-shadow-2xl)

/* Premium shadows */
var(--brx-shadow-primary)        /* Purple glow */
var(--brx-shadow-secondary)      /* Gold glow */
var(--brx-shadow-glass)          /* Glass effect */
var(--brx-shadow-focus)          /* Focus ring */
```

## Animations

### Duration
```css
var(--brx-duration-instant)      /* 75ms */
var(--brx-duration-fast)         /* 150ms */
var(--brx-duration-normal)       /* 300ms */
var(--brx-duration-slow)         /* 500ms */
```

### Easing
```css
var(--brx-ease-linear)
var(--brx-ease-in)
var(--brx-ease-out)              /* Most common */
var(--brx-ease-in-out)
var(--brx-ease-premium)          /* Bouncy */
var(--brx-ease-smooth)
var(--brx-ease-snappy)
```

### Keyframes
```css
animation: brx-fade-in var(--brx-duration-normal) var(--brx-ease-out);
animation: brx-slide-in-up var(--brx-duration-normal) var(--brx-ease-premium);
animation: brx-scale-in var(--brx-duration-normal) var(--brx-ease-out);
animation: brx-shimmer 2s linear infinite;
animation: brx-pulse 2s ease-in-out infinite;
animation: brx-spin 1s linear infinite;
```

## Common Patterns

### Premium Button
```css
.btn {
  background: var(--brx-color-primary);
  color: var(--brx-text-inverse);
  padding: var(--brx-spacing-3) var(--brx-spacing-6);
  border-radius: var(--brx-radius-lg);
  font-weight: var(--brx-font-semibold);
  box-shadow: var(--brx-shadow-md);
  transition: all var(--brx-duration-fast) var(--brx-ease-out);
}

.btn:hover {
  box-shadow: var(--brx-shadow-primary);
  transform: translateY(-2px);
}
```

### Card
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
  transform: translateY(-4px);
}
```

### Glass Effect
```css
.glass {
  background: var(--brx-bg-glass);
  backdrop-filter: blur(12px);
  box-shadow: var(--brx-shadow-glass);
  border: 1px solid rgba(255, 255, 255, 0.18);
}
```

### Input
```css
.input {
  padding: var(--brx-spacing-3) var(--brx-spacing-4);
  border: 1px solid var(--brx-border);
  border-radius: var(--brx-radius-lg);
  background: var(--brx-bg-primary);
  color: var(--brx-text-primary);
  transition: all var(--brx-duration-fast) var(--brx-ease-out);
}

.input:focus {
  border-color: var(--brx-border-focus);
  box-shadow: var(--brx-shadow-focus);
}
```

### Text Gradient
```css
.gradient-text {
  background: linear-gradient(
    135deg,
    var(--brx-color-primary-600),
    var(--brx-color-secondary-500)
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

### Skeleton Loader
```css
.skeleton {
  background: linear-gradient(
    90deg,
    var(--brx-bg-secondary) 25%,
    var(--brx-bg-tertiary) 50%,
    var(--brx-bg-secondary) 75%
  );
  background-size: 200% 100%;
  animation: brx-shimmer 1.5s ease-in-out infinite;
  border-radius: var(--brx-radius);
}
```

## Utility Classes

### Display
```css
.hidden
.block
.flex
.grid
```

### Flexbox
```css
.flex-row
.flex-col
.items-center
.justify-center
.justify-between
.gap-4
```

### Text
```css
.text-center
.text-left
.text-right
.text-primary
.text-secondary
.font-bold
.font-semibold
```

### Animations
```css
.brx-animate-fade-in
.brx-animate-slide-in-up
.brx-animate-scale-in
.brx-animate-shimmer
.brx-animate-pulse
```

### Effects
```css
.brx-glass                       /* Glass morphism */
.brx-gradient-primary            /* Primary gradient background */
.brx-gradient-secondary          /* Secondary gradient background */
.brx-gradient-premium            /* Premium gradient */
.brx-text-gradient-primary       /* Primary text gradient */
.brx-text-gradient-premium       /* Premium text gradient */
.hover-lift                      /* Lift on hover */
.hover-scale                     /* Scale on hover */
.hover-glow                      /* Glow on hover */
```

## Dark Mode

### Enable Dark Mode
```typescript
// Via data attribute
document.documentElement.setAttribute('data-theme', 'dark');

// Via media query (automatic)
@media (prefers-color-scheme: dark) { }
```

### Light Mode
```typescript
document.documentElement.setAttribute('data-theme', 'light');
```

## Import Paths

### TypeScript
```typescript
import { broxivaDesignTokens } from '@broxiva/ui/styles';
import { broxivaTailwindConfig } from '@broxiva/ui/styles/tailwind.config';
```

### CSS
```css
@import '@broxiva/ui/styles/broxiva-theme.css';
@import '@/styles/broxiva-globals.css';
```

## Breakpoints

```css
/* Mobile first */
@media (min-width: 640px) { }   /* sm */
@media (min-width: 768px) { }   /* md */
@media (min-width: 1024px) { }  /* lg */
@media (min-width: 1280px) { }  /* xl */
@media (min-width: 1536px) { }  /* 2xl */
```

## Z-Index Layers

```css
var(--brx-z-dropdown)            /* 1000 */
var(--brx-z-sticky)              /* 1020 */
var(--brx-z-fixed)               /* 1030 */
var(--brx-z-modal-backdrop)      /* 1040 */
var(--brx-z-modal)               /* 1050 */
var(--brx-z-popover)             /* 1060 */
var(--brx-z-tooltip)             /* 1070 */
var(--brx-z-notification)        /* 1080 */
```

## Accessibility

### Focus Ring
```css
:focus-visible {
  outline: 2px solid var(--brx-border-focus);
  outline-offset: 2px;
}
```

### Screen Reader Only
```css
.sr-only
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Tips

1. Use CSS variables for runtime theming
2. Stick to the spacing scale (4px multiples)
3. Follow the type scale for font sizes
4. Always provide focus states
5. Test in both light and dark modes
6. Respect reduced motion preferences
7. Use semantic HTML
8. Ensure proper color contrast

---

For full documentation, see:
- `DESIGN_SYSTEM.md` - Complete design system guide
- `IMPLEMENTATION_GUIDE.md` - Integration instructions
- `examples.tsx` - Component examples
