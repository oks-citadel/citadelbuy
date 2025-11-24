# CitadelBuy Frontend

Next.js 15 frontend application for CitadelBuy e-commerce platform.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.local.example` to `.env.local` and update the values:

```bash
cp .env.local.example .env.local
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/              # Next.js app router pages
├── components/       # React components
│   └── ui/          # Reusable UI components
├── hooks/           # Custom React hooks
├── lib/             # Utility functions and API client
├── styles/          # Global styles
└── types/           # TypeScript type definitions
```

## Features

- Server-side rendering (SSR)
- Static site generation (SSG)
- API routes
- Image optimization
- TypeScript support
- Tailwind CSS styling
- Responsive design
- SEO optimization

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking
