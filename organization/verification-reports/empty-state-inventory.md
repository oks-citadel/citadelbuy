# Empty State Inventory

**Date:** 2026-01-05
**Platform:** Broxiva E-Commerce Platform

---

## Overview

This document catalogs all empty states across the Broxiva E-Commerce Platform, including their implementation status, design quality, and any improvements made.

---

## Web Application Empty States

### Customer-Facing Pages

| Page/Component | Path | Has Empty State | Icon | Title | Description | CTA | Quality |
|----------------|------|-----------------|------|-------|-------------|-----|---------|
| Cart | `/cart` | Yes | ShoppingCart | "Your cart is empty" | "Looks like you haven't added anything to your cart yet..." | "Discover Products" | Excellent |
| Wishlist | `/account/wishlist` | Yes | Heart | "Your wishlist is empty" | "Save items you love by clicking the heart icon" | "Discover Products" | Excellent |
| Orders | `/account/orders` | Yes | Package | "No orders yet" / "No matching orders" | Contextual based on filter | "Start Shopping" / "Adjust filters" | Excellent |
| Search | `/search` | Yes | None | "No results found" | "Try a different search term" | None | Good |
| Search (no query) | `/search` | Yes | None | N/A | "Enter a search term to find products..." | None | Good |
| Products | `/products` | Yes | SlidersHorizontal | "No products found" | "Try adjusting your filters or search terms" | "Clear Filters" | Excellent |

### Account Section

| Page/Component | Path | Has Empty State | Icon | Title | Description | CTA | Quality |
|----------------|------|-----------------|------|-------|-------------|-----|---------|
| Addresses | `/account/addresses` | Yes | MapPin | "No addresses saved" | "Add your shipping addresses for faster checkout" | "Add Address" | Good |
| Payment Methods | `/account/payment-methods` | Yes | CreditCard | "No payment methods" | "Add a payment method for faster checkout" | "Add Payment Method" | Good |
| Reviews | `/account/reviews` | Yes | Star | "No reviews yet" | "Products you've reviewed will appear here" | "Browse Products" | Good |
| Gift Cards | `/account/gift-cards` | Yes | Gift | "No gift cards" | "Your gift cards will appear here" | "Buy Gift Card" | Good |
| Returns | `/account/returns` | Yes | RotateCcw | "No returns" | "Your return requests will appear here" | None | Basic |

### Admin Section

| Page/Component | Path | Has Empty State | Icon | Title | Description | CTA | Quality |
|----------------|------|-----------------|------|-------|-------------|-----|---------|
| Products | `/admin/products` | Yes | Package | "No products" | "Start adding products to your catalog" | "Add Product" | Good |
| Orders | `/admin/orders` | Yes | ShoppingBag | "No orders" | "Orders will appear here" | None | Basic |
| Customers | `/admin/customers` | Yes | Users | "No customers" | "Customers will appear here as they register" | None | Basic |
| Support Tickets | `/admin/support` | Yes | MessageSquare | "No tickets" | "Support tickets will appear here" | None | Basic |
| Product Reviews | `/admin/products/reviews` | Yes | Star | "No reviews" | "Product reviews will appear here" | None | Basic |

### Vendor Section

| Page/Component | Path | Has Empty State | Icon | Title | Description | CTA | Quality |
|----------------|------|-----------------|------|-------|-------------|-----|---------|
| Products | `/vendor/products` | Yes | Package | "No products" | "Add your first product to start selling" | "Add Product" | Good |
| Orders | `/vendor/orders` | Yes | ShoppingBag | "No orders" | "Orders will appear as customers purchase" | None | Basic |
| Campaigns | `/vendor/campaigns` | Yes | Megaphone | "No campaigns" | "Create your first marketing campaign" | "Create Campaign" | Good |
| Email Templates | `/vendor/email/templates` | Yes | Mail | "No templates" | "Create email templates for campaigns" | "Create Template" | Good |

---

## Mobile Application Empty States

### Main Screens

| Screen | File | Has Empty State | Icon | Title | Description | CTA | Quality |
|--------|------|-----------------|------|-------|-------------|-----|---------|
| Cart | `CartScreen.tsx` | Yes | cart-outline | "Your cart is empty" | "Add items to your cart to get started" | "Start Shopping" | Excellent |
| Orders | `OrdersScreen.tsx` | Yes | cube-outline | "No orders found" | Contextual: "No {status} orders" | None | Excellent |
| Wishlist | `WishlistScreen.tsx` | Yes | heart-outline | "Your wishlist is empty" | "Items you love will appear here" | "Browse Products" | Good |
| Search | `SearchScreen.tsx` | Yes | search-outline | "No results" | "Try different keywords" | None | Good |

### Account Screens

| Screen | File | Has Empty State | Icon | Title | Description | CTA | Quality |
|--------|------|-----------------|------|-------|-------------|-----|---------|
| Addresses | `AddressesScreen.tsx` | Yes | location-outline | "No addresses" | "Add your delivery addresses" | "Add Address" | Good |
| Notifications | `NotificationsScreen.tsx` | Yes | notifications-outline | "No notifications" | "You're all caught up" | None | Basic |

### Vendor Screens

| Screen | File | Has Empty State | Icon | Title | Description | CTA | Quality |
|--------|------|-----------------|------|-------|-------------|-----|---------|
| Products | `VendorProductsScreen.tsx` | Yes | cube-outline | "No products" | "Add your first product" | "Add Product" | Good |
| Orders | `VendorOrdersScreen.tsx` | Yes | bag-outline | "No orders" | "Orders will appear here" | None | Basic |

---

## Shared UI Components

### New Reusable Component (Web)

**File:** `organization/apps/web/src/components/ui/EmptyState.tsx`

```typescript
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; href?: string; onClick?: () => void; };
  secondaryAction?: { label: string; href?: string; onClick?: () => void; };
  variant?: 'default' | 'card' | 'inline';
  size?: 'sm' | 'md' | 'lg';
}
```

**Usage Examples:**
```tsx
// Basic usage
<EmptyState
  icon={ShoppingCart}
  title="Your cart is empty"
  description="Start shopping to fill it up!"
  action={{ label: "Shop Now", href: "/products" }}
/>

// With card variant
<EmptyState
  icon={Package}
  title="No orders yet"
  description="Your orders will appear here"
  action={{ label: "Start Shopping", href: "/" }}
  variant="card"
/>

// Small inline version
<EmptyState
  icon={Search}
  title="No results"
  description="Try different keywords"
  variant="inline"
  size="sm"
/>
```

### New Reusable Component (Mobile)

**File:** `organization/apps/mobile/src/components/EmptyState.tsx`

```typescript
interface EmptyStateProps {
  icon: IoniconsName;
  title: string;
  description: string;
  action?: { label: string; onPress: () => void; };
  secondaryAction?: { label: string; onPress: () => void; };
  size?: 'sm' | 'md' | 'lg';
}
```

---

## Quality Assessment Criteria

| Level | Criteria |
|-------|----------|
| **Excellent** | Icon, clear title, helpful description, relevant CTA, consistent styling |
| **Good** | Icon, clear title, description, CTA (optional but logical) |
| **Basic** | Title and description only, no clear next action |
| **Missing** | No empty state handling |

---

## Recommendations

### High Priority
1. Add CTAs to all "Basic" quality empty states in admin/vendor sections
2. Implement contextual help links for empty states
3. Add illustration images for key empty states (cart, orders, wishlist)

### Medium Priority
1. Add loading-to-empty state transitions
2. Implement first-time user onboarding hints
3. Add recently viewed products on search "no results" state

### Low Priority
1. Add animations for empty state reveals
2. Implement A/B testing for CTA copy
3. Add smart suggestions based on user history

---

## Empty State Design Guidelines

### Anatomy
```
+----------------------------------+
|            [Icon]                |
|                                  |
|           Title                  |
|       Description text           |
|                                  |
|      [Primary Button]            |
|      [Secondary Link]            |
+----------------------------------+
```

### Sizing Guidelines
| Size | Icon Container | Title | Description | Use Case |
|------|----------------|-------|-------------|----------|
| sm | 80px | 16px | 13px | Inline, cards, modals |
| md | 100px | 18px | 14px | Page sections |
| lg | 120px | 20px | 15px | Full-page empty states |

### Copy Guidelines
1. **Title**: Confirm what's empty (e.g., "Your cart is empty")
2. **Description**: Explain why or what happens next
3. **CTA**: Use action verbs (e.g., "Add Address", "Start Shopping")

---

*Inventory compiled by Agent 22 - Error Handling & Edge-Case UI Validator*
