# Broxiva Brand Identity System

## Brand Overview

**Brand Name:** Broxiva
**Tagline:** "Global Premium E-Commerce, Delivered"
**Domain:** www.broxiva.com
**Industry:** Premium Global E-Commerce Platform

---

## Brand Values

1. **Trust** - Deep navy conveys reliability and security
2. **Premium Quality** - Gold accents signal luxury and excellence
3. **Innovation** - Modern design reflects cutting-edge technology
4. **Global Reach** - Sophisticated aesthetics appeal worldwide

---

## Color Palette

### Primary Colors

| Color | Hex | Usage |
|-------|-----|-------|
| **Deep Navy** | `#1a365d` | Primary brand color, headers, CTAs |
| **Navy Dark** | `#0f2447` | Hover states, emphasis |
| **Navy Darkest** | `#0a1929` | Dark mode backgrounds |

### Accent Colors

| Color | Hex | Usage |
|-------|-----|-------|
| **Premium Gold** | `#c9a227` | Highlights, promotions, badges |
| **Gold Light** | `#ffdb66` | Soft accents, notifications |
| **Gold Dark** | `#a68418` | Active states |

### Semantic Colors

| Purpose | Color | Hex |
|---------|-------|-----|
| Success | Emerald | `#10b981` |
| Warning | Amber | `#f59e0b` |
| Error | Red | `#ef4444` |
| Info | Blue | `#3b82f6` |

---

## Typography

### Primary Font: Inter
- **Use:** Body text, UI elements, buttons
- **Weights:** 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold)

### Display Font: Playfair Display
- **Use:** Hero headlines, luxury product titles
- **Weights:** 400 (Regular), 700 (Bold)

### Font Scale (Based on 16px)

```
Display:    4rem / 64px  - Hero headlines
H1:         3rem / 48px  - Page titles
H2:         2.25rem / 36px - Section headers
H3:         1.875rem / 30px - Subsection headers
H4:         1.5rem / 24px - Card titles
H5:         1.25rem / 20px - Small headers
Body:       1rem / 16px  - Default text
Small:      0.875rem / 14px - Captions
XS:         0.75rem / 12px - Labels
```

---

## Spacing System (8px Base)

```
0:   0px
1:   4px   (0.25rem)
2:   8px   (0.5rem)
3:   12px  (0.75rem)
4:   16px  (1rem)
5:   20px  (1.25rem)
6:   24px  (1.5rem)
8:   32px  (2rem)
10:  40px  (2.5rem)
12:  48px  (3rem)
16:  64px  (4rem)
20:  80px  (5rem)
24:  96px  (6rem)
```

---

## Elevation (Box Shadows)

```css
/* Soft - Cards, subtle elevation */
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06);

/* Medium - Dropdowns, popovers */
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.06);

/* Large - Modals, dialogs */
box-shadow: 0 12px 32px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08);

/* Glow - Focus states, premium highlights */
box-shadow: 0 0 24px rgba(26, 54, 93, 0.3), 0 0 12px rgba(26, 54, 93, 0.2);

/* Gold Glow - Accent highlights */
box-shadow: 0 0 24px rgba(201, 162, 39, 0.3), 0 0 12px rgba(201, 162, 39, 0.2);
```

---

## Border Radius

```
sm:   6px   - Small buttons, inputs
md:   8px   - Cards, containers
lg:   12px  - Large cards, modals
xl:   16px  - Hero sections
2xl:  24px  - Premium highlights
full: 9999px - Pills, avatars
```

---

## Animation Timing

```css
/* Spring - Micro-interactions */
transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

/* Smooth - Page transitions */
transition: all 0.4s ease-out;

/* Quick - Hover states */
transition: all 0.15s ease-in-out;
```

---

## Logo Usage

### Primary Logo
- Full color logo on light backgrounds
- Minimum size: 120px width
- Clear space: 1.5x the height of the "B"

### Inverted Logo
- White logo on dark/navy backgrounds
- Same sizing and spacing rules

### Icon Mark
- Standalone "B" icon for favicons, app icons
- Minimum size: 32px

---

## UI Component Guidelines

### Buttons

**Primary Button**
- Background: Deep Navy (`#1a365d`)
- Text: White
- Hover: Navy Dark (`#0f2447`)
- Border Radius: 8px
- Padding: 12px 24px

**Accent Button**
- Background: Premium Gold (`#c9a227`)
- Text: Navy Darkest (`#0a1929`)
- Hover: Gold Dark (`#a68418`)

**Secondary Button**
- Background: Transparent
- Border: 1px solid Navy
- Text: Deep Navy

### Cards

- Background: White
- Border: 1px solid `#e5e7eb`
- Border Radius: 12px
- Shadow: Soft elevation
- Hover: Medium elevation

### Form Inputs

- Border: 1px solid `#d1d5db`
- Border Radius: 8px
- Focus: 2px ring Deep Navy
- Error: 2px ring Red

---

## Accessibility Standards

- **WCAG 2.1 AA Compliance Required**
- Minimum contrast ratio: 4.5:1 for body text
- Minimum contrast ratio: 3:1 for large text
- Focus indicators must be visible
- All interactive elements keyboard accessible
- Screen reader friendly markup

---

## File Naming Conventions

```
Assets:     broxiva-{asset-type}-{variant}-{size}.{ext}
Components: {ComponentName}.tsx
Styles:     {component-name}.css
Images:     broxiva-{category}-{descriptor}.{ext}
```

---

## Digital Assets Required

### Web Assets
- [ ] Logo (SVG, PNG @1x, @2x, @3x)
- [ ] Favicon (ICO, PNG 16x16, 32x32, 180x180)
- [ ] Open Graph Image (1200x630)
- [ ] Twitter Card (1200x600)
- [ ] Hero Images (1920x1080, 2560x1440)

### Email Assets
- [ ] Email Header (600px width)
- [ ] Email Footer
- [ ] Transactional Templates

### Marketing Assets
- [ ] Social Media Kit
- [ ] Banner Ads (standard sizes)
- [ ] Product Showcase Templates

---

## Brand Voice

**Tone:** Professional, Confident, Premium, Trustworthy

**Do:**
- Use clear, concise language
- Emphasize quality and reliability
- Focus on customer benefits
- Be globally inclusive

**Don't:**
- Use slang or informal language
- Make exaggerated claims
- Use complex jargon
- Be culturally insensitive

---

*Brand Identity System v1.0*
*Broxiva - Global Premium E-Commerce Platform*
