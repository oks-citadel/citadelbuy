# Broxiva Design System - Implementation Guide

This guide will help you integrate and use the Broxiva Design System in your project.

## Quick Start

### 1. Import Global Styles

In your root layout file (`apps/web/src/app/layout.tsx`):

```typescript
import '@/styles/broxiva-globals.css';
// This automatically imports broxiva-theme.css as well
```

### 2. Use Design Tokens in TypeScript

```typescript
import { broxivaDesignTokens } from '@broxiva/ui/styles';

// Access color tokens
const primaryColor = broxivaDesignTokens.colors.primary[800]; // #6b21a8

// Access spacing tokens
const spacing = broxivaDesignTokens.spacing[4]; // 1rem

// Access typography
const displayFont = broxivaDesignTokens.typography.fontFamily.display;
```

### 3. Use CSS Custom Properties

```css
.my-button {
  background-color: var(--brx-color-primary);
  color: var(--brx-text-inverse);
  padding: var(--brx-spacing-3) var(--brx-spacing-6);
  border-radius: var(--brx-radius-lg);
  box-shadow: var(--brx-shadow-md);
  transition: all var(--brx-duration-fast) var(--brx-ease-out);
}

.my-button:hover {
  box-shadow: var(--brx-shadow-primary);
  transform: translateY(-2px);
}
```

### 4. Use with Tailwind CSS

Update your `tailwind.config.js`:

```javascript
const { broxivaTailwindConfig } = require('@broxiva/ui/styles/tailwind.config');

module.exports = {
  ...broxivaTailwindConfig,
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  // ... rest of your config
};
```

Then use Tailwind classes:

```tsx
<button className="bg-primary text-white px-6 py-3 rounded-lg hover:shadow-primary hover:-translate-y-0.5">
  Shop Now
</button>
```

## Complete Setup Guide

### Step 1: Install Dependencies

Ensure you have the required fonts loaded. The global CSS already imports them, but for Next.js optimization:

```typescript
// app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Playfair_Display } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} ${jetbrainsMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
```

### Step 2: Import Global Styles

```typescript
// app/layout.tsx or pages/_app.tsx
import '@/styles/broxiva-globals.css';
```

### Step 3: Implement Dark Mode (Optional)

#### Using Context Provider

```typescript
// contexts/theme-context.tsx
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const ThemeContext = createContext<{
  theme: Theme;
  toggleTheme: () => void;
}>({
  theme: 'light',
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    // Check system preference
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Check localStorage
    const savedTheme = localStorage.getItem('broxiva-theme') as Theme;

    const initialTheme = savedTheme || (isDark ? 'dark' : 'light');
    setTheme(initialTheme);
    document.documentElement.setAttribute('data-theme', initialTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('broxiva-theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
```

#### Theme Toggle Button

```typescript
// components/theme-toggle.tsx
'use client';

import { useTheme } from '@/contexts/theme-context';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      style={{
        padding: 'var(--brx-spacing-2)',
        borderRadius: 'var(--brx-radius-lg)',
        background: 'var(--brx-bg-secondary)',
        border: '1px solid var(--brx-border)',
        cursor: 'pointer',
        transition: 'all var(--brx-duration-fast) var(--brx-ease-out)',
      }}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
```

## Component Examples

### Premium Button

```typescript
// components/ui/button.tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  const baseClass = 'btn';
  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-${size}`;

  return (
    <button
      className={`${baseClass} ${variantClass} ${sizeClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
};
```

### Premium Card

```typescript
// components/ui/card.tsx
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  variant?: 'default' | 'glass' | 'premium';
  hoverable?: boolean;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  hoverable = true,
  className = '',
}) => {
  const classes = [
    'card',
    variant === 'glass' && 'brx-glass',
    variant === 'premium' && 'card-premium',
    hoverable && 'hover-lift',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classes}>{children}</div>;
};
```

### Typography Components

```typescript
// components/ui/typography.tsx
import React from 'react';

interface HeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  gradient?: boolean;
  className?: string;
}

export const Heading: React.FC<HeadingProps> = ({
  level,
  children,
  gradient = false,
  className = '',
}) => {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  const classes = [gradient && 'brx-text-gradient-premium', className]
    .filter(Boolean)
    .join(' ');

  return <Tag className={classes}>{children}</Tag>;
};
```

## Using with Styled Components

```typescript
import styled from 'styled-components';

const PremiumButton = styled.button`
  background-color: var(--brx-color-primary);
  color: var(--brx-text-inverse);
  padding: var(--brx-spacing-3) var(--brx-spacing-6);
  border-radius: var(--brx-radius-lg);
  font-weight: var(--brx-font-semibold);
  border: none;
  cursor: pointer;
  transition: all var(--brx-duration-fast) var(--brx-ease-out);

  &:hover {
    background-color: var(--brx-color-primary-900);
    box-shadow: var(--brx-shadow-primary);
    transform: translateY(-2px);
  }

  &:active {
    transform: translateY(0);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;
```

## Using with CSS Modules

```css
/* button.module.css */
.button {
  background-color: var(--brx-color-primary);
  color: var(--brx-text-inverse);
  padding: var(--brx-spacing-3) var(--brx-spacing-6);
  border-radius: var(--brx-radius-lg);
  font-weight: var(--brx-font-semibold);
  border: none;
  cursor: pointer;
  transition: all var(--brx-duration-fast) var(--brx-ease-out);
}

.button:hover {
  background-color: var(--brx-color-primary-900);
  box-shadow: var(--brx-shadow-primary);
  transform: translateY(-2px);
}

.buttonSecondary {
  composes: button;
  background-color: var(--brx-color-secondary);
}

.buttonSecondary:hover {
  background-color: var(--brx-color-secondary-600);
  box-shadow: var(--brx-shadow-secondary);
}
```

## Animation Patterns

### Fade In on Load

```tsx
import { useEffect, useRef } from 'react';

export function FadeInSection({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('brx-animate-fade-in');
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ opacity: 0 }}>
      {children}
    </div>
  );
}
```

### Stagger Animation

```tsx
export function StaggerList({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map((item, index) => (
        <li
          key={index}
          className="stagger-item"
          style={{
            animationDelay: `${index * 100}ms`,
          }}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}
```

### Loading Skeleton

```tsx
export function ProductSkeleton() {
  return (
    <div className="card">
      <div className="skeleton" style={{ height: '200px', marginBottom: 'var(--brx-spacing-4)' }} />
      <div className="skeleton" style={{ height: '24px', width: '70%', marginBottom: 'var(--brx-spacing-2)' }} />
      <div className="skeleton" style={{ height: '16px', width: '50%' }} />
    </div>
  );
}
```

## Accessibility Checklist

### Color Contrast
- ✅ All text meets WCAG 2.1 AA standards
- ✅ Interactive elements have sufficient contrast
- ✅ Focus states are clearly visible

### Keyboard Navigation
- ✅ All interactive elements are keyboard accessible
- ✅ Focus order is logical
- ✅ Focus indicators are visible

### Screen Readers
- ✅ Semantic HTML elements used
- ✅ ARIA labels provided where needed
- ✅ Alternative text for images

### Motion
- ✅ Respects prefers-reduced-motion
- ✅ Animations are optional
- ✅ No flashing content

## Performance Best Practices

### 1. CSS Custom Properties
- Use CSS custom properties for runtime theming
- Avoid inline styles when possible
- Leverage CSS cascade

### 2. Font Loading
- Use font-display: swap
- Preload critical fonts
- Use variable fonts when available

### 3. Animations
- Use transform and opacity for animations
- Avoid animating layout properties
- Use will-change sparingly

### 4. Bundle Size
- Import only what you need
- Tree-shake unused tokens
- Consider code splitting

## Troubleshooting

### Dark Mode Not Working

1. Ensure data-theme attribute is set:
```typescript
document.documentElement.setAttribute('data-theme', 'dark');
```

2. Check that broxiva-theme.css is imported before other styles

3. Verify CSS custom properties are available:
```typescript
getComputedStyle(document.documentElement).getPropertyValue('--brx-color-primary');
```

### Fonts Not Loading

1. Verify font imports in layout.tsx
2. Check network tab for font requests
3. Ensure font-display: swap is set
4. Try preloading fonts in head

### Styles Not Applying

1. Check CSS import order
2. Verify CSS module naming
3. Check for specificity issues
4. Use browser DevTools to inspect applied styles

### TypeScript Errors

1. Ensure @broxiva/ui is in dependencies
2. Check tsconfig paths
3. Restart TypeScript server
4. Clear .next cache

## Migration Guide

### From Existing Styles

1. **Identify current colors**
   - Map to Broxiva palette
   - Use closest matching token

2. **Update spacing**
   - Replace arbitrary values with spacing scale
   - Use 4px-based multiples

3. **Typography conversion**
   - Map font sizes to type scale
   - Apply font families
   - Update line heights

4. **Animation updates**
   - Use Broxiva timing functions
   - Apply consistent durations
   - Leverage keyframes

### Example Migration

Before:
```css
.button {
  background: #7c3aed;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  transition: all 0.2s ease;
}
```

After:
```css
.button {
  background: var(--brx-color-primary);
  padding: var(--brx-spacing-3) var(--brx-spacing-6);
  border-radius: var(--brx-radius-lg);
  font-size: var(--brx-text-sm);
  transition: all var(--brx-duration-fast) var(--brx-ease-out);
}
```

## Resources

- [Design System Documentation](./DESIGN_SYSTEM.md)
- [Component Examples](./src/styles/examples.tsx)
- [Tailwind Configuration](./src/styles/tailwind.config.ts)
- [Design Tokens](./src/styles/broxiva-design-tokens.ts)

## Support

For questions or issues:
1. Check this implementation guide
2. Review component examples
3. Check design system documentation
4. Open an issue on GitHub

---

**Happy Building with Broxiva!** 🎨✨
