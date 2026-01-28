# Broxiva Design System

## Overview

The Broxiva Design System provides a consistent, premium visual language across the entire platform. Built on Tailwind CSS with custom tokens for dark atmospheric themes.

---

## Color System

### Brand Colors (bx-*)

| Token | Value | Usage |
|-------|-------|-------|
| `--bx-pink` | `#EC4899` | Primary accent, CTAs, highlights |
| `--bx-violet` | `#8B5CF6` | Secondary accent, gradients |
| `--bx-cyan` | `#06B6D4` | Tertiary accent, links |
| `--bx-mint` | `#10B981` | Success states |
| `--bx-gold` | `#F59E0B` | Premium/VIP features |

### Background Layers

| Token | Value | Usage |
|-------|-------|-------|
| `--bx-bg-0` | `#0D0D0D` | Base layer (near-black) |
| `--bx-bg-1` | `#1A1A2E` | Primary surfaces |
| `--bx-bg-2` | `#1F1F2E` | Elevated surfaces |
| `--bx-bg-3` | `#252538` | Modals, popovers |

### Text Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--bx-text` | `#F8FAFC` | Primary text (headings) |
| `--bx-text-secondary` | `#E2E8F0` | Secondary text (body) |
| `--bx-text-muted` | `#94A3B8` | Muted text (captions) |
| `--bx-text-dim` | `#64748B` | Dimmed text (metadata) |

### Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--bx-success` | `#10B981` | Success states |
| `--bx-warning` | `#F59E0B` | Warning states |
| `--bx-danger` | `#EF4444` | Error states |
| `--bx-info` | `#3B82F6` | Info states |

---

## Gradients

### Commerce Aurora (Primary)
```css
background: linear-gradient(135deg, #EC4899 0%, #8B5CF6 50%, #06B6D4 100%);
```
**Usage:** Hero highlights, primary CTAs, premium micro-interactions

### Trust Gradient (Secondary)
```css
background: linear-gradient(135deg, #1E3A5F 0%, #3B82F6 50%, #06B6D4 100%);
```
**Usage:** Checkout, payments, security badges

### Elite Gradient (Luxury)
```css
background: linear-gradient(135deg, #92400E 0%, #F59E0B 100%);
```
**Usage:** VIP features, premium membership

---

## Typography

### Font Families
- **Display:** Playfair Display (serif) - Headlines
- **Sans:** Inter (sans-serif) - Body text
- **Mono:** JetBrains Mono - Code
- **bx:** Georgia (serif) - Premium accent text

### Font Sizes (bx-*)
| Class | Size | Line Height |
|-------|------|-------------|
| `text-bx-xs` | 0.75rem (12px) | 1rem |
| `text-bx-sm` | 0.8125rem (13px) | 1.25rem |
| `text-bx-base` | 0.875rem (14px) | 1.5rem |
| `text-bx-lg` | 1rem (16px) | 1.75rem |

---

## Spacing & Layout

### Border Radius (bx-*)
| Class | Value | Usage |
|-------|-------|-------|
| `rounded-bx-card` | 20px | Cards, panels |
| `rounded-bx-chip` | 999px | Buttons, badges |
| `rounded-bx-modal` | 24px | Modals, dialogs |

### Shadows (bx-*)
| Class | Usage |
|-------|-------|
| `shadow-bx-card` | Standard card elevation |
| `shadow-bx-glow-pink` | Pink glow accent |
| `shadow-bx-glow-cyan` | Cyan glow accent |
| `shadow-bx-glow-violet` | Violet glow accent |
| `shadow-bx-glow-gold` | Gold glow accent |

---

## Components

### BroxivaBackground

Premium dark atmospheric background with layered gradients.

```tsx
import { BroxivaBackground } from '@/components/theme/BroxivaBackground';

// Variants: 'default' | 'hero' | 'minimal'
<BroxivaBackground variant="hero">
  {children}
</BroxivaBackground>
```

### BrandLogo

Unified logo component for consistent branding.

```tsx
import { BrandLogo } from '@/components/brand/BrandLogo';

// Variants: 'default' | 'compact' | 'mono' | 'footer'
// Themes: 'light' | 'dark' | 'auto'
<BrandLogo variant="default" theme="auto" />
```

---

## Motion

### Timing Functions
- `spring`: `cubic-bezier(0.34, 1.56, 0.64, 1)` - Bouncy spring effect

### Animations
| Class | Duration | Usage |
|-------|----------|-------|
| `animate-fade-in` | 200ms | Fade in elements |
| `animate-slide-up-fade` | 400ms | Slide up with fade |
| `animate-scale-in` | 300ms | Scale in effect |
| `animate-float` | 3s | Floating effect |
| `animate-shimmer` | 2.5s | Loading shimmer |

---

## Accessibility

### Contrast Requirements
- All text must meet WCAG AA standards
- Primary text (`--bx-text`) on backgrounds: 7:1 contrast ratio
- Muted text (`--bx-text-muted`): 4.5:1 minimum

### Motion Preferences
- All animations respect `prefers-reduced-motion`
- No auto-playing animations
- No scroll hijacking

---

## File Locations

| File | Purpose |
|------|---------|
| `apps/web/tailwind.config.ts` | Tailwind token definitions |
| `apps/web/src/styles/globals.css` | CSS variable definitions |
| `apps/web/src/components/theme/BroxivaBackground.tsx` | Background component |
| `apps/web/src/components/brand/BrandLogo.tsx` | Logo component |

---

*Last updated: January 2026*
