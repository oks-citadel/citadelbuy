# @broxiva/ui

Shared React UI components for the Broxiva platform built with Tailwind CSS and Radix UI primitives.

## Installation

```bash
pnpm add @broxiva/ui
```

## Peer Dependencies

- React >= 18.0.0
- React DOM >= 18.0.0

## Usage

```typescript
import { Button, Card, Input } from '@broxiva/ui';

function MyComponent() {
  return (
    <Card>
      <Input placeholder="Enter text" />
      <Button variant="primary">Submit</Button>
    </Card>
  );
}
```

## Available Components

Components are located in `src/components/` and include common UI elements following the Broxiva design system.

## Styling

This package uses:

- **Tailwind CSS** - Utility-first CSS framework
- **class-variance-authority** - Component variant management
- **tailwind-merge** - Intelligent class merging
- **Lucide React** - Icon library

## Development

```bash
# Build the package
pnpm build

# Watch mode for development
pnpm dev

# Run tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run linting
pnpm lint
```

## Design System

See `src/design-system/` for design tokens, theme configuration, and style utilities.
