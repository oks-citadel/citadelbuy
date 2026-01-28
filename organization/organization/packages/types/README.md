# @broxiva/types

Shared TypeScript type definitions for the Broxiva platform.

## Installation

```bash
pnpm add @broxiva/types
```

## Usage

```typescript
import { CategoryType } from '@broxiva/types';
import { CategoryType as CT } from '@broxiva/types/category.types';
```

## Available Types

### Category Types (`category.types.ts`)

Type definitions for product categories used across the platform.

## Development

```bash
# Build the package
pnpm build

# Watch mode for development
pnpm dev

# Run linting
pnpm lint
```

## Exports

The package exports all types from the main entry point:

```typescript
import { ... } from '@broxiva/types';
```

Individual type files can also be imported directly:

```typescript
import { ... } from '@broxiva/types/category.types';
```
