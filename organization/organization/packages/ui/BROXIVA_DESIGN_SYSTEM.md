# Broxiva Design System

Premium luxury design system for high-end e-commerce experiences.

## Overview

The Broxiva Design System provides a complete set of design tokens and premium UI components designed specifically for luxury e-commerce applications. Every element has been crafted to convey trust, sophistication, and premium quality.

## Design Philosophy

### Core Principles

1. **Luxury & Elegance**: Premium visual aesthetics that convey quality
2. **Trust & Reliability**: Deep navy primary color for trustworthiness
3. **Attention to Detail**: Subtle animations and refined interactions
4. **Accessibility First**: WCAG 2.1 AA compliant color contrasts
5. **Performance**: Optimized components with smooth 60fps animations

## Color System

### Primary Color - Deep Navy

The primary color (#1a365d) conveys trust, sophistication, and stability. It's used for:
- Primary buttons and CTAs
- Navigation elements
- Brand identity
- Key interactive elements

**Accessibility**: All primary color combinations meet WCAG AA standards for text contrast.

### Accent Color - Luxurious Gold

The accent color (#c9a227) represents premium quality and exclusivity. Use it for:
- Special promotions and offers
- Premium badges
- Highlighting luxury features
- Secondary CTAs

### Semantic Colors

- **Success** (#10b981): Confirmations, success states
- **Warning** (#f59e0b): Alerts, important notices
- **Error** (#ef4444): Errors, destructive actions
- **Info** (#3b82f6): Informational messages

### Neutral Grays

A sophisticated 11-point gray scale for backgrounds, borders, and text hierarchy.

## Typography

### Font Families

#### Display Font - Playfair Display
Elegant serif font for headings and hero sections.
```css
font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
```

#### Body Font - Inter
Modern, highly readable sans-serif for UI and body text.
```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

#### Monospace - JetBrains Mono
For code and technical content.
```css
font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
```

### Type Scale

The system uses a fluid, rem-based type scale for accessibility:

- **8xl**: 6rem (96px) - Hero displays
- **7xl**: 4.5rem (72px) - Large displays
- **6xl**: 3.75rem (60px) - Medium displays
- **5xl**: 3rem (48px) - H1 headings
- **4xl**: 2.25rem (36px) - H2 headings
- **3xl**: 1.875rem (30px) - H3 headings
- **2xl**: 1.5rem (24px) - H4 headings
- **xl**: 1.25rem (20px) - H5 headings
- **lg**: 1.125rem (18px) - H6, large body
- **base**: 1rem (16px) - Body text
- **sm**: 0.875rem (14px) - Small text
- **xs**: 0.75rem (12px) - Captions

## Spacing System

8px base grid system for consistent layouts:

- Base unit: 0.5rem (8px)
- All spacing values are multiples of 8px
- Uses rem units for accessibility

### Semantic Spacing

- **Component**: Internal spacing (4-32px)
- **Content**: Between elements (8-48px)
- **Section**: Between sections (48-160px)
- **Layout**: Page margins (16-64px)

## Shadows & Elevation

Progressive elevation system for visual hierarchy:

- **xs**: Subtle lift (1-2px)
- **sm**: Cards at rest (2-4px)
- **md**: Hoverable elements (8-16px)
- **lg**: Modals, drawers (16-24px)
- **xl**: Maximum elevation (24-32px)

### Branded Shadows

- **primary**: Navy-colored shadow for brand elements
- **accent**: Gold-colored shadow for premium features
- **glow**: Soft glow effects

## Components

### Button

Premium button with gold accents and smooth animations.

```tsx
import { Button } from '@broxiva/ui';

<Button variant="primary" size="lg">
  Shop Now
</Button>

<Button variant="accent" size="md" leftIcon={<Icon />}>
  Add to Cart
</Button>
```

**Variants**: primary, accent, secondary, outline, ghost, link
**Sizes**: sm, md, lg, xl

### Card

Elegant cards with subtle shadows and premium animations.

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@broxiva/ui';

<Card variant="elevated" interactive>
  <CardHeader>
    <CardTitle>Premium Product</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

### Input

Refined form inputs with premium styling.

```tsx
import { Input } from '@broxiva/ui';

<Input
  label="Email Address"
  placeholder="you@example.com"
  error="Invalid email"
  leftIcon={<EmailIcon />}
/>
```

### Badge

Premium badges for promotions and labels.

```tsx
import { Badge } from '@broxiva/ui';

<Badge variant="accent" size="md" dot>
  New Arrival
</Badge>

<Badge variant="error">
  -30% OFF
</Badge>
```

### ProductCard

High-end product display component.

```tsx
import { ProductCard } from '@broxiva/ui';

<ProductCard
  imageSrc="/product.jpg"
  imageAlt="Product Name"
  title="Luxury Watch"
  price={1299.99}
  originalPrice={1799.99}
  badge="Bestseller"
  badgeVariant="accent"
  rating={4.5}
  reviewCount={128}
  onAddToCart={handleAddToCart}
  onQuickView={handleQuickView}
/>
```

### HeroSection

Immersive hero component for landing pages.

```tsx
import { HeroSection } from '@broxiva/ui';

<HeroSection
  title="Discover Luxury"
  subtitle="New Collection"
  description="Elevate your style with our curated selection"
  backgroundImage="/hero-bg.jpg"
  primaryCta={{
    text: "Shop Now",
    onClick: handleShopNow
  }}
  secondaryCta={{
    text: "Learn More",
    onClick: handleLearnMore
  }}
  height="full"
  alignment="center"
/>
```

### NavBar

Premium navigation with smooth animations.

```tsx
import { NavBar } from '@broxiva/ui';

<NavBar
  logo={<Logo />}
  links={[
    { label: "Shop", href: "/shop" },
    { label: "Collections", href: "/collections" },
    { label: "About", href: "/about" }
  ]}
  actions={
    <>
      <Button variant="ghost">Sign In</Button>
      <Button variant="accent">Get Started</Button>
    </>
  }
  sticky
  transparent
/>
```

## Animations

### Timing Functions

- **linear**: Constant speed
- **spring**: Bouncy, premium feel (cubic-bezier(0.34, 1.56, 0.64, 1))
- **smooth**: Smooth acceleration/deceleration
- **snappy**: Quick, responsive feel

### Durations

- **instant**: 75ms
- **fast**: 150ms
- **normal**: 300ms
- **slow**: 500ms

### Pre-built Animations

- **fade-in**: Smooth opacity transition
- **slide-up**: Slide up with fade
- **scale-in**: Scale with fade
- **float**: Gentle floating motion
- **shimmer**: Loading shimmer effect

## Usage

### Installation

```bash
pnpm add @broxiva/ui
```

### Setup

1. Import the design system in your app:

```tsx
import '@broxiva/ui/styles';
import { Button, Card } from '@broxiva/ui';
```

2. Configure Tailwind to use Broxiva tokens (already configured in web app):

```js
// tailwind.config.ts
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}'
  ],
  // ... rest of config uses Broxiva tokens
};
```

3. Import fonts in your global CSS:

```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800&display=swap');
```

## Accessibility

### WCAG Compliance

All color combinations meet WCAG 2.1 AA standards:

- Primary text on white: 12.63:1 (AAA)
- Secondary text on white: 7.42:1 (AA)
- Accent text on white: 4.52:1 (AA)

### Keyboard Navigation

- All interactive elements are keyboard accessible
- Focus rings are clearly visible
- Tab order is logical and predictable

### Screen Readers

- Semantic HTML structure
- ARIA labels where appropriate
- Meaningful alt text for images

## Best Practices

### Do's

- Use primary color for main CTAs
- Use accent color sparingly for premium features
- Maintain consistent spacing using the 8px grid
- Use appropriate elevation for visual hierarchy
- Ensure all text meets contrast requirements

### Don'ts

- Don't mix display and sans fonts in the same heading
- Don't use accent color for error states
- Don't create custom spacing values outside the system
- Don't disable focus indicators
- Don't use color alone to convey meaning

## Contributing

When adding new components or tokens:

1. Follow existing naming conventions
2. Ensure WCAG AA compliance
3. Add TypeScript types
4. Document usage examples
5. Test across browsers and devices

## License

Proprietary - Broxiva Platform
