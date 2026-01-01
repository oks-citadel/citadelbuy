# RTL (Right-to-Left) Support Guide

## Overview

This guide covers implementing and testing Right-to-Left (RTL) language support for Arabic and other RTL languages on the Broxiva platform.

## RTL Languages Supported

Currently supported RTL languages:
- **Arabic (ar)**: العربية
- Hebrew (future): עברית

## Architecture

### Detection

RTL is automatically detected based on the selected language:

```typescript
// Frontend detection
import { isRTLLanguage } from '@/lib/i18n/config';

const isRTL = isRTLLanguage('ar'); // true

// Backend detection
import { LocaleDetectionService } from '@/modules/i18n/locale-detection.service';

const isRTL = localeDetection.isRTL('ar'); // true
```

### HTML Attributes

When an RTL language is selected, the following attributes are automatically set:

```html
<html dir="rtl" lang="ar">
```

This triggers all RTL CSS rules.

## CSS Implementation

### RTL Stylesheet

The RTL stylesheet is located at:
```
organization/apps/web/src/styles/rtl.css
```

All RTL-specific styles are scoped under `html[dir="rtl"]`.

### Importing RTL Styles

Add to your global stylesheet or layout:

```css
/* globals.css */
@import './rtl.css';
```

Or in your Next.js layout:

```typescript
// app/layout.tsx
import '@/styles/rtl.css';
```

## Common RTL Patterns

### Text Alignment

```css
/* LTR (default) */
.text-left { text-align: left; }

/* RTL override */
html[dir="rtl"] .text-left {
  text-align: right !important;
}
```

### Flexbox Reversals

```css
/* LTR */
.flex-row { flex-direction: row; }

/* RTL */
html[dir="rtl"] .flex-row {
  flex-direction: row-reverse;
}
```

### Padding & Margin

```css
/* LTR */
.ml-4 { margin-left: 1rem; }

/* RTL */
html[dir="rtl"] .ml-4 {
  margin-left: 0;
  margin-right: 1rem;
}
```

### Positioning

```css
/* LTR */
.left-0 { left: 0; }

/* RTL */
html[dir="rtl"] .left-0 {
  left: auto;
  right: 0;
}
```

### Icons & Images

Some icons need to be mirrored for RTL:

```css
/* Mirror chevrons and arrows */
html[dir="rtl"] .icon-mirror,
html[dir="rtl"] .chevron,
html[dir="rtl"] .arrow {
  transform: scaleX(-1);
}
```

Example in React:

```typescript
<ChevronRightIcon className="icon-mirror" />
```

## Tailwind CSS RTL

If using Tailwind CSS, use logical properties:

### Installation

```bash
npm install tailwindcss-rtl
```

### Configuration

```javascript
// tailwind.config.js
module.exports = {
  plugins: [
    require('tailwindcss-rtl'),
  ],
};
```

### Usage

```typescript
// Instead of ml-4 and mr-4
<div className="ms-4">  {/* margin-start */}
<div className="me-4">  {/* margin-end */}

// Instead of pl-4 and pr-4
<div className="ps-4">  {/* padding-start */}
<div className="pe-4">  {/* padding-end */}

// Instead of left-0 and right-0
<div className="start-0">  {/* inset-start */}
<div className="end-0">   {/* inset-end */}
```

## Typography for Arabic

### Font Selection

Arabic requires specific fonts that support Arabic script:

```css
html[dir="rtl"][lang="ar"] {
  font-family: 'Tajawal', 'Cairo', 'Almarai', 'Noto Sans Arabic', sans-serif;
  line-height: 1.8;
  letter-spacing: normal;
}
```

### Recommended Arabic Fonts

1. **Tajawal** - Modern, clean, supports all weights
2. **Cairo** - Readable, good for UI
3. **Almarai** - Simple, great for body text
4. **Noto Sans Arabic** - Google's universal Arabic font
5. **IBM Plex Sans Arabic** - Professional, enterprise-grade

### Loading Fonts

Add to your `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap" rel="stylesheet">
```

Or use Next.js Font optimization:

```typescript
// app/layout.tsx
import { Tajawal } from 'next/font/google';

const tajawal = Tajawal({
  weight: ['300', '400', '500', '700'],
  subsets: ['arabic'],
  display: 'swap',
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={tajawal.className}>
      <body>{children}</body>
    </html>
  );
}
```

### Line Height

Arabic text needs more line height:

```css
html[dir="rtl"][lang="ar"] p {
  line-height: 2;
}

html[dir="rtl"][lang="ar"] h1,
html[dir="rtl"][lang="ar"] h2,
html[dir="rtl"][lang="ar"] h3 {
  line-height: 1.6;
}
```

## Component-Specific RTL

### Navigation

```typescript
// Navigation component
import { useLanguage } from '@/lib/i18n/useTranslation';

function Navigation() {
  const { isRTL } = useLanguage();

  return (
    <nav className={isRTL ? 'flex-row-reverse' : 'flex-row'}>
      <a href="/">Home</a>
      <a href="/products">Products</a>
    </nav>
  );
}
```

### Shopping Cart

```css
html[dir="rtl"] .cart-item {
  flex-direction: row-reverse;
}

html[dir="rtl"] .cart-item-image {
  margin-left: 1rem;
  margin-right: 0;
}
```

### Product Cards

```css
html[dir="rtl"] .product-card {
  text-align: right;
}

/* Keep prices in LTR (numbers read left-to-right) */
html[dir="rtl"] .product-price {
  direction: ltr;
  display: inline-block;
}
```

### Forms

```css
html[dir="rtl"] label {
  text-align: right;
}

html[dir="rtl"] input[type="checkbox"] {
  margin-left: 0.5rem;
  margin-right: 0;
}
```

### Modals & Dialogs

```css
html[dir="rtl"] .modal {
  direction: rtl;
  text-align: right;
}

html[dir="rtl"] .modal-close {
  left: 1rem;
  right: auto;
}
```

## Mixed Content (LTR in RTL)

Some content should always remain LTR even in RTL mode:

### Email Addresses

```html
<span class="email">user@example.com</span>
```

```css
html[dir="rtl"] .email {
  direction: ltr;
  display: inline-block;
}
```

### Phone Numbers

```html
<span class="phone">+1 234 567 8900</span>
```

```css
html[dir="rtl"] .phone {
  direction: ltr;
  display: inline-block;
}
```

### URLs

```html
<span class="url">https://broxiva.com</span>
```

```css
html[dir="rtl"] .url {
  direction: ltr;
  display: inline-block;
}
```

### Code Snippets

```html
<code class="code">const x = 10;</code>
```

```css
html[dir="rtl"] .code {
  direction: ltr;
  text-align: left;
}
```

### Numbers & Prices

```html
<span class="currency">$99.99</span>
```

```css
html[dir="rtl"] .currency {
  direction: ltr;
  display: inline-block;
}
```

## Testing RTL

### Manual Testing

1. Switch language to Arabic
2. Verify `html[dir="rtl"]` is set
3. Check all pages for layout issues
4. Test responsive layouts
5. Verify icons are mirrored correctly

### Browser DevTools

Force RTL in Chrome DevTools:
```javascript
document.documentElement.setAttribute('dir', 'rtl');
document.documentElement.setAttribute('lang', 'ar');
```

### Automated Testing

```typescript
// cypress/e2e/rtl.cy.ts
describe('RTL Support', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should switch to RTL when Arabic is selected', () => {
    cy.get('[data-testid="language-switcher"]').click();
    cy.contains('العربية').click();

    cy.get('html').should('have.attr', 'dir', 'rtl');
    cy.get('html').should('have.attr', 'lang', 'ar');
  });

  it('should mirror navigation in RTL', () => {
    cy.switchLanguage('ar');

    cy.get('nav').should('have.css', 'flex-direction', 'row-reverse');
  });

  it('should keep prices in LTR format', () => {
    cy.switchLanguage('ar');

    cy.get('.product-price').should('have.css', 'direction', 'ltr');
  });
});
```

## Common Issues & Solutions

### Issue: Text alignment broken

**Solution**: Ensure `text-align` is overridden for RTL:
```css
html[dir="rtl"] .my-class {
  text-align: right !important;
}
```

### Issue: Icons not mirroring

**Solution**: Add mirror class:
```typescript
<Icon className="icon-mirror" />
```

### Issue: Dropdown menus positioned incorrectly

**Solution**: Override position for RTL:
```css
html[dir="rtl"] .dropdown-menu {
  left: auto;
  right: 0;
}
```

### Issue: Flex layout not reversing

**Solution**: Use `flex-direction: row-reverse`:
```css
html[dir="rtl"] .flex-container {
  flex-direction: row-reverse;
}
```

### Issue: Arabic text looks cramped

**Solution**: Increase line-height:
```css
html[dir="rtl"][lang="ar"] {
  line-height: 1.8;
}
```

## Best Practices

### 1. Use Logical Properties

Prefer `margin-inline-start` over `margin-left`:
```css
/* Good */
.my-class {
  margin-inline-start: 1rem;
}

/* Avoid */
.my-class {
  margin-left: 1rem;
}
```

### 2. Test Early and Often

Don't wait until the end to test RTL. Test after every component.

### 3. Use RTL-Aware Icons

Some icons should mirror, others shouldn't:
- **Mirror**: Arrows, chevrons, back/forward buttons
- **Don't mirror**: Clock icons, search icons, shopping cart

### 4. Consider Cultural Differences

RTL isn't just about layout. Consider cultural norms:
- Date formats
- Number formats
- Currency symbols

### 5. Accessibility

Ensure RTL doesn't break accessibility:
- Screen readers should work correctly
- Keyboard navigation should be logical
- Focus indicators should be visible

## Resources

### Tools

- **RTL CSS Plugin**: https://rtlcss.com/
- **Tailwind RTL**: https://github.com/20lives/tailwindcss-rtl
- **RTL Testing Tool**: https://github.com/MohammadYounes/rtl-detect

### References

- [W3C RTL Guidelines](https://www.w3.org/International/questions/qa-html-dir)
- [MDN dir attribute](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/dir)
- [Material Design RTL](https://material.io/design/usability/bidirectionality.html)

## Support

For RTL-related issues:
- Slack: #rtl-support
- GitHub Issues: Tag with `rtl` label
- Documentation: https://docs.broxiva.com/i18n/rtl
