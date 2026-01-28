# @broxiva/utils

Shared utility functions for the Broxiva platform.

## Installation

```bash
pnpm add @broxiva/utils
```

## Usage

```typescript
import { formatCurrency, formatDate, validateEmail } from '@broxiva/utils';

// Format currency
formatCurrency(99.99, 'USD'); // "$99.99"

// Format dates
formatDate(new Date(), 'yyyy-MM-dd');

// Validate input
validateEmail('user@example.com'); // true
```

## Dependencies

This package includes the following utility libraries:

- **date-fns** - Date manipulation and formatting
- **lodash** - General utility functions
- **zod** - Schema validation

## Development

```bash
# Build the package
pnpm build

# Watch mode for development
pnpm dev

# Run tests
pnpm test

# Run linting
pnpm lint
```

## Exports

All utilities are exported from the main entry point:

```typescript
import { ... } from '@broxiva/utils';
```
