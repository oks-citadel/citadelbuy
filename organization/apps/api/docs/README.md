# CitadelBuy Backend

NestJS backend API for CitadelBuy e-commerce platform.

## Tech Stack

- **Framework**: NestJS 10
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: JWT + Passport
- **Validation**: class-validator + Zod
- **Documentation**: Swagger/OpenAPI
- **Payment**: Stripe

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16
- Redis 7

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

### Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Run migrations
npm run migrate

# Seed database (optional)
npm run db:seed
```

### Development

```bash
npm run dev
```

API will be available at [http://localhost:4000/api](http://localhost:4000/api)

API Documentation: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

### Build

```bash
npm run build
npm run start:prod
```

## Project Structure

```
src/
├── common/           # Shared utilities, guards, filters
│   ├── guards/      # Auth guards
│   ├── filters/     # Exception filters
│   ├── interceptors/# Interceptors
│   └── prisma/      # Prisma service
├── config/          # Configuration files
├── modules/         # Feature modules
│   ├── auth/       # Authentication module
│   ├── users/      # User management
│   ├── products/   # Product management
│   ├── orders/     # Order management
│   └── payments/   # Payment processing
├── app.module.ts    # Root module
└── main.ts         # Application entry point
```

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start:prod` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run tests
- `npm run migrate` - Run database migrations
- `npm run db:seed` - Seed database
- `npm run prisma:studio` - Open Prisma Studio

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Users
- `GET /api/users/profile` - Get current user profile

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product (authenticated)

### Orders
- `GET /api/orders` - Get user orders (authenticated)
- `POST /api/orders` - Create new order (authenticated)

### Payments
- `POST /api/payments/create-intent` - Create Stripe payment intent (authenticated)
