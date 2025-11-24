# Changelog

All notable changes to the CitadelBuy Commerce Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.6.0] - 2025-11-16

### Added - Phase 5: Order Status Management

#### Backend Features

- **Enhanced OrdersService**
  - updateOrderStatus method for status transitions
  - updateOrderPayment method for payment confirmation
  - Store payment intent ID and payment method
  - Comprehensive error handling and logging
  - Track status changes with before/after logging

- **Webhook Integration**
  - Connected payment webhooks to order updates
  - Automatic status update PENDING → PROCESSING on payment success
  - Payment failure handling and logging
  - OrdersService injection in PaymentsController
  - PaymentsModule imports OrdersModule

- **Order DTOs**
  - UpdateOrderStatusDto with enum validation
  - Optional payment intent ID and method fields
  - class-validator decorators
  - Swagger documentation

#### Frontend Features

- **Order History Page**
  - List all user orders sorted by date
  - Order cards with status badges
  - Color-coded status indicators
  - Product previews (up to 2 items)
  - "View Details" link for each order
  - Empty state with call-to-action
  - Loading and error states
  - Authentication required

- **Updated Checkout Flow**
  - Create order before payment (PENDING status)
  - Payment intent includes order ID in metadata
  - Webhook updates existing order on payment success
  - Simplified place order (no duplicate creation)
  - Better error handling and recovery

- **Navigation Updates**
  - Added "Orders" link to navbar
  - Only visible when authenticated
  - Quick access to order history

#### Status Management

- **Order Status Flow**
  - PENDING: Order created, payment pending
  - PROCESSING: Payment confirmed via webhook
  - SHIPPED: Manual update (future)
  - DELIVERED: Manual update (future)
  - CANCELLED: Manual update (future)

- **Status Colors**
  - PENDING: Yellow badge
  - PROCESSING: Blue badge
  - SHIPPED: Purple badge
  - DELIVERED: Green badge
  - CANCELLED: Red badge

### Changed

- Checkout flow now creates order before payment
- Payment intent creation includes order ID
- Place order simplified (order already exists)
- Webhook handlers now update order status

### Technical Details

- **Order Creation:** Shipping step → Create order (PENDING)
- **Payment Link:** Payment intent metadata includes order ID
- **Webhook Update:** payment_intent.succeeded → Order PROCESSING
- **User Tracking:** Order history page with status visualization

### Files Added/Modified

- 4 backend files created/modified
- 3 frontend files created/modified
- ~600 lines of code
- Complete order lifecycle management

---

## [0.5.0] - 2025-11-16

### Added - Phase 4: Stripe Payment Integration

#### Backend Features

- **Enhanced Payments Service**
  - Stripe client initialization with environment config
  - Create payment intents with amount and metadata
  - Support for user ID and order ID in metadata
  - Retrieve payment intent details
  - Construct and verify webhook events
  - Comprehensive error handling and logging

- **Payments Controller**
  - POST /payments/create-intent endpoint
  - JWT authentication for payment creation
  - Webhook endpoint for Stripe events
  - Signature verification for webhooks
  - Handle payment success/failure/canceled events
  - Swagger API documentation

- **Payment DTOs**
  - CreatePaymentIntentDto with validation
  - Amount, currency, order ID fields
  - class-validator decorators
  - Minimum amount validation ($0.50)

#### Frontend Features

- **Stripe Provider Component**
  - Load Stripe.js with publishable key
  - Elements provider with custom theming
  - Client secret management
  - Graceful handling when not configured

- **Stripe Payment Form**
  - Integrated Stripe Elements
  - PaymentElement with tabs layout
  - Client-side payment confirmation
  - Loading states during processing
  - Error message display
  - Security notice

- **Payments API Client**
  - TypeScript interfaces for type safety
  - createPaymentIntent method
  - Automatic auth token injection

- **Updated Checkout Flow**
  - Create payment intent after shipping
  - Display loading during intent creation
  - Wrap payment form with StripeProvider
  - Confirm payment before review
  - Store payment intent ID for order

#### Environment Configuration

- **Backend Variables**
  - STRIPE_SECRET_KEY for API calls
  - STRIPE_WEBHOOK_SECRET for verification

- **Frontend Variables**
  - NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  - Frontend .env.example file created

### Technical Details

- **Payment Flow:** Intent creation → Elements display → Confirmation → Order
- **Security:** Webhook signature verification, JWT auth, PCI compliance
- **Supported Methods:** Card, Apple Pay, Google Pay (automatic)
- **Error Handling:** Stripe errors displayed to users
- **Loading States:** Visual feedback during all async operations

### Files Added/Modified

- 4 backend files created/modified
- 5 frontend files created/modified
- ~1,000 lines of code
- Payment intent API + Stripe Elements integration

---

## [0.4.0] - 2025-11-16

### Added - Phase 3: Shopping Cart & Checkout

#### Frontend Features

- **Shopping Cart System**
  - Cart Zustand store with localStorage persistence
  - Add, remove, update quantity operations
  - Computed values: itemCount, subtotal, tax, total
  - Stock validation when adding items
  - Cart badge in navbar with live count
  - Cart page with full item management
  - CartItem component with quantity controls
  - CartSummary component with pricing breakdown
  - Free shipping threshold ($50+)

- **Multi-Step Checkout Flow**
  - CheckoutSteps progress indicator component
  - Three-step process: Shipping → Payment → Review
  - ShippingForm with React Hook Form + Zod validation
  - PaymentForm (placeholder for Stripe integration)
  - OrderReview component with full order summary
  - Navigation between checkout steps
  - Empty cart validation and redirect
  - Back/forward navigation with state preservation

- **Order Confirmation**
  - Order confirmation page at `/orders/[id]`
  - Success banner after order placement
  - Complete order details display
  - Order items with product images
  - Shipping address confirmation
  - Order status indicator
  - Price breakdown (subtotal, tax, shipping, total)
  - Download invoice button (placeholder)
  - Email confirmation notice

- **Product Integration**
  - Add to cart from ProductCard
  - Add to cart from ProductInfo
  - "Added to Cart" success feedback
  - Quantity selector with stock validation

#### Backend Features

- **Order Management API**
  - Create order endpoint with full validation
  - Get all user orders endpoint
  - Get order by ID endpoint
  - Transaction-based order creation
  - Order items created with order
  - User-scoped order access
  - JWT authentication required

- **DTOs and Validation**
  - CreateOrderDto with nested validation
  - ShippingAddressDto with all address fields
  - OrderItemDto with product, quantity, price
  - class-validator decorators for all fields

- **Enhanced Order Service**
  - Create orders with items in single transaction
  - Store shipping address as JSON
  - Calculate and store totals
  - Find orders by user ID with sorting
  - Find order by ID with user validation
  - Include product details in responses

#### Database Changes

- **Updated Order Model**
  - Added `subtotal` field
  - Added `tax` field
  - Added `shipping` field
  - Changed `shippingAddress` to JSON string
  - Made `paymentMethod` optional
  - Added indexes for userId and status

#### API Client

- **Orders API Client** (`lib/api/orders.ts`)
  - TypeScript interfaces for type safety
  - getAll() - Fetch all orders
  - getById(orderId) - Fetch specific order
  - create(orderData) - Create new order
  - Automatic shippingAddress JSON parsing

### Changed

- Updated Navbar to include cart badge
- Enhanced ProductCard with add to cart functionality
- Enhanced ProductInfo with quantity selection
- Updated Prisma schema for Order model

### Technical Details

- **Cart Persistence**: localStorage with Zustand persist
- **Form Validation**: React Hook Form + Zod schemas
- **State Management**: Zustand for cart state
- **API Integration**: Axios with TypeScript interfaces
- **Transaction Safety**: Prisma transactions for orders
- **Real-time Updates**: Reactive cart badge updates

### Files Added/Modified

- 12 frontend files created/modified
- 3 backend files created/modified
- ~1,200 lines of TypeScript code
- ~300 lines of backend code

### Business Logic

- **Pricing**: Subtotal + 10% tax + shipping
- **Shipping**: $9.99 flat rate, FREE for orders ≥ $50
- **Stock**: Validation when adding to cart
- **Status**: Orders created with PENDING status

---

## [0.3.0] - 2025-11-16

### Added - Phase 2: Product Management

#### Frontend Features

- **Product Listing Page** (`/products`)
  - Grid layout with responsive columns
  - Pagination with page controls
  - Loading and error states
  - Empty state handling
  - Total product count display

- **Product Filters**
  - Search by name/description
  - Price range filter (min/max)
  - Category filter
  - Sort options (newest, price low/high, popular)
  - Apply filters button
  - Filter state management

- **Product Components**
  - ProductCard with image, name, price
  - ProductGrid for layout
  - ProductFilters sidebar
  - Responsive design

- **Product Detail Page** (`/products/[id]`)
  - Large product image gallery
  - Product information display
  - Price and stock display
  - Category display
  - Back to products navigation

- **Image Gallery**
  - Main image display
  - Thumbnail grid
  - Click to switch images
  - Responsive sizing

- **Products Store**
  - Zustand store for products state
  - Filters and pagination state
  - fetchProducts action with query params
  - Type-safe state management

#### Backend Features

- **Enhanced Products API**
  - Query parameters support
  - Search functionality (name, description)
  - Price range filtering (min/max)
  - Category filtering
  - Sorting (createdAt, price, name)
  - Pagination (page, limit)
  - Case-insensitive search

- **QueryProductsDto**
  - Validation for all query parameters
  - Type transformations
  - Min/max constraints
  - Enum validation for sorting

- **Products Service**
  - Advanced filtering with Prisma
  - Pagination with total count
  - Include category in responses
  - Efficient database queries

- **Products Controller**
  - Full CRUD endpoints (GET, POST, PUT, DELETE)
  - Swagger documentation
  - ApiResponse decorators
  - Type-safe DTOs

### Technical Details

- **Search**: Case-insensitive with Prisma
- **Pagination**: Server-side with total pages
- **Filtering**: Combined query with Prisma where
- **Sorting**: Dynamic orderBy with Prisma

### Files Added

- 9 frontend files
- 3 backend files enhanced
- ~800 lines of code

---

## [0.2.0] - 2025-11-16

### Added - Phase 1: Authentication System

#### Frontend Features
- **Authentication Pages**
  - Login page with form validation (`/auth/login`)
  - Registration page with password confirmation (`/auth/register`)
  - User profile page with account details (`/profile`)
  - Protected route HOC for auth-required pages
  - Auth provider for global auth state initialization

- **UI Components**
  - Input component with validation states
  - Label component for accessible forms
  - Card components (Header, Content, Footer, Description)
  - Avatar component with fallback initials
  - Button component variants (default, outline, ghost, destructive)

- **State Management**
  - Zustand auth store with persistence
  - Login/register/logout actions
  - Auto-fetch user on mount
  - Token management (localStorage)
  - Error and loading states

- **Navigation**
  - Dynamic navbar with auth state
  - User avatar display when authenticated
  - Login/Register buttons when logged out
  - Profile link and dropdown
  - Responsive mobile menu (placeholder)

- **Form Validation**
  - Zod schemas for login and registration
  - React Hook Form integration
  - Real-time validation feedback
  - Type-safe form data

#### Backend Features
- **Authentication Module**
  - JWT-based authentication
  - User registration endpoint
  - Login endpoint with credentials validation
  - Password hashing with bcrypt
  - Token generation and verification

- **User Module**
  - Get current user profile endpoint
  - User CRUD operations
  - Role-based access (CUSTOMER, VENDOR, ADMIN)

- **Security**
  - Passport JWT strategy
  - Passport Local strategy
  - Auth guards for protected routes
  - CORS configuration
  - Helmet security headers
  - Rate limiting (100 requests/minute)

#### Database
- **Prisma Schema Models**
  - User model with roles
  - Category model
  - Product model with relations
  - Order model with status tracking
  - OrderItem model
  - Review model with ratings

#### Infrastructure
- **Docker Compose**
  - PostgreSQL 16 container
  - Redis 7 container
  - pgAdmin container (optional)
  - Volume persistence
  - Health checks

- **CI/CD Pipelines**
  - Automated testing workflow
  - Staging deployment workflow
  - Production deployment workflow
  - Security scanning with Trivy
  - Multi-environment support

#### Documentation
- Development Guide with complete setup instructions
- Project Status document with roadmap
- Phase 1 completion report
- Quick Run Guide for 5-minute setup
- API documentation with Swagger
- README files for frontend and backend

### Changed
- Updated Next.js to version 15 with App Router
- Updated React to version 19
- Updated dependencies for React 19 compatibility
- Modified root layout to include Navbar and AuthProvider

### Technical Details
- **Languages**: TypeScript 5.3
- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: NestJS 10, Prisma 5
- **Database**: PostgreSQL 16
- **Cache**: Redis 7
- **Authentication**: JWT with Passport
- **Validation**: Zod + class-validator
- **State**: Zustand 5.0

### Files Added
- 13+ frontend component/page files
- 25+ backend module files
- 3 CI/CD workflow files
- 5 documentation files
- Total: ~45 new files, ~2,000 LOC

---

## [0.1.0] - 2025-11-16

### Added - Project Foundation

#### Project Structure
- Monorepo setup with npm workspaces
- Frontend directory (Next.js 15)
- Backend directory (NestJS 10)
- Infrastructure directory (Docker, Terraform)
- Root configuration files

#### Configuration
- `.gitignore` for all environments
- `.prettierrc` for code formatting
- `.eslintrc.json` for linting
- TypeScript configurations
- Environment variable templates

#### Build Tools
- Workspace scripts for development
- Concurrent dev server running
- Build scripts for production
- Docker commands for services
- Database migration scripts

#### Documentation
- Project architecture documentation
- Business plan and strategy docs
- Technical stack documentation
- Platform requirements checklist
- Implementation guidelines

### Initial Setup
- Git repository initialization
- npm workspace configuration
- Development tooling setup
- Code quality standards established

---

## Upcoming Releases

### [0.6.0] - Order Status & Testing (Planned)
- Connect payment webhooks to order status
- Implement updateOrderStatus in OrdersService
- Unit tests for all modules
- Integration tests for payment flow
- E2E tests with Playwright
- Performance optimization

### [0.7.0] - Advanced Features (Planned)
- Product reviews and ratings
- Wishlist functionality
- Order tracking with status updates
- Email notifications
- Admin dashboard
- Order history page
- Saved addresses

### [0.7.0] - Testing & Quality (Planned)
- Unit tests for components
- Integration tests for API
- E2E tests with Playwright
- Performance optimization
- Security audit
- Accessibility improvements

### [1.0.0] - MVP Launch (Planned)
- Complete e-commerce functionality
- Production deployment to Azure
- Performance optimization
- Security hardening
- User acceptance testing
- Documentation finalization

---

## Version History

- **v0.6.0** (2025-11-16) - Order Status Management ✅
- **v0.5.0** (2025-11-16) - Stripe Payment Integration ✅
- **v0.4.0** (2025-11-16) - Shopping Cart & Checkout ✅
- **v0.3.0** (2025-11-16) - Product Management ✅
- **v0.2.0** (2025-11-16) - Authentication System ✅
- **v0.1.0** (2025-11-16) - Project Foundation ✅
- **v0.7.0** (Planned) - Admin Dashboard & Advanced Features
- **v0.8.0** (Planned) - Testing & Quality Assurance
- **v1.0.0** (Planned) - MVP Launch

---

## Migration Guide

### From v0.1.0 to v0.2.0

#### Dependencies
```bash
npm install --workspaces
```

#### Database
```bash
cd backend
npm run prisma:generate
npm run migrate
```

#### Environment Variables
Add to `backend/.env`:
```env
JWT_SECRET=your-secret-key
JWT_EXPIRATION=7d
```

Add to `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

#### Breaking Changes
- None (new features only)

---

## Contributors

- AI Development Assistant - Initial implementation
- Your Team - Future enhancements

---

## License

Proprietary - CitadelBuy Commerce Platform
