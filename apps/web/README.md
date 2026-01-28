# Broxiva Web

Next.js 15 web application for the Broxiva e-commerce platform.

## Prerequisites

- Node.js 20+ (LTS recommended)
- pnpm 10+ (package manager)

## Setup

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

3. **Start development server**
   ```bash
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create a `.env.local` file with these variables (see `.env.example` for full list):

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API URL |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL for real-time features |
| `NEXT_PUBLIC_APP_URL` | This app's public URL |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe public key |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error tracking DSN |

### Feature Flags

See `.env.feature-flags.example` for available feature flags:

```bash
NEXT_PUBLIC_ENABLE_AI_FEATURES=true
NEXT_PUBLIC_ENABLE_AR_TRYON=true
NEXT_PUBLIC_ENABLE_VOICE_SEARCH=true
NEXT_PUBLIC_ENABLE_CHATBOT=true
```

## Development

```bash
# Start dev server on port 3000
pnpm dev

# Type checking
pnpm type-check

# Lint code
pnpm lint
```

## Testing

```bash
# Run unit tests
pnpm test

# Run e2e tests (Playwright)
pnpm test:e2e
```

## Production Build

```bash
# Create production build
pnpm build

# Start production server
pnpm start
```

## Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set environment variables in the Vercel dashboard
3. Deploy automatically on push to main

### Docker

```bash
# Build image
docker build -t broxiva-web .

# Run container
docker run -p 3000:3000 broxiva-web
```

### Self-hosted

```bash
pnpm build
pnpm start
```

## Project Structure

```
app/                    # Next.js App Router pages
  (auth)/               # Authentication routes
  (dashboard)/          # User dashboard
  (shop)/               # Shopping pages
  api/                  # API routes
components/
  ui/                   # Reusable UI components (shadcn/ui)
  features/             # Feature-specific components
hooks/                  # Custom React hooks
lib/                    # Utilities and configurations
stores/                 # Zustand state stores
types/                  # TypeScript types
```

## Key Technologies

- **Framework:** Next.js 15 with App Router
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI, shadcn/ui
- **State Management:** Zustand, TanStack Query
- **Forms:** React Hook Form, Zod validation
- **Payments:** Stripe Elements
- **Animations:** Framer Motion
- **Monitoring:** Sentry
