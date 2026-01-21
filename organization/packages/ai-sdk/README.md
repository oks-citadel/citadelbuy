# @broxiva/ai-sdk

Client SDK for Broxiva AI services including recommendations, search, personalization, fraud detection, and chatbot.

## Installation

```bash
pnpm add @broxiva/ai-sdk
```

## Usage

### Recommendation Service

```typescript
import { RecommendationClient } from '@broxiva/ai-sdk/recommendation';

const client = new RecommendationClient({
  baseUrl: process.env.AI_RECOMMENDATION_URL,
  apiKey: process.env.AI_API_KEY,
});

const recommendations = await client.getRecommendations({
  userId: 'user-123',
  limit: 10,
});
```

### Search Service

```typescript
import { SearchClient } from '@broxiva/ai-sdk/search';

const client = new SearchClient({
  baseUrl: process.env.AI_SEARCH_URL,
  apiKey: process.env.AI_API_KEY,
});

const results = await client.semanticSearch({
  query: 'wireless headphones',
  filters: { category: 'electronics' },
});
```

### Personalization Service

```typescript
import { PersonalizationClient } from '@broxiva/ai-sdk/personalization';

const client = new PersonalizationClient({
  baseUrl: process.env.AI_PERSONALIZATION_URL,
  apiKey: process.env.AI_API_KEY,
});

const profile = await client.getUserProfile('user-123');
```

### Fraud Detection Service

```typescript
import { FraudClient } from '@broxiva/ai-sdk/fraud';

const client = new FraudClient({
  baseUrl: process.env.AI_FRAUD_URL,
  apiKey: process.env.AI_API_KEY,
});

const riskScore = await client.analyzeTransaction({
  orderId: 'order-123',
  amount: 500.00,
  currency: 'USD',
});
```

### Chatbot Service

```typescript
import { ChatbotClient } from '@broxiva/ai-sdk/chatbot';

const client = new ChatbotClient({
  baseUrl: process.env.AI_CHATBOT_URL,
  apiKey: process.env.AI_API_KEY,
});

const response = await client.sendMessage({
  sessionId: 'session-123',
  message: 'What is your return policy?',
});
```

## Available Modules

| Module | Export Path | Description |
|--------|-------------|-------------|
| Recommendation | `@broxiva/ai-sdk/recommendation` | Product recommendations |
| Search | `@broxiva/ai-sdk/search` | Semantic/AI-powered search |
| Personalization | `@broxiva/ai-sdk/personalization` | User personalization |
| Fraud | `@broxiva/ai-sdk/fraud` | Fraud detection |
| Chatbot | `@broxiva/ai-sdk/chatbot` | AI chatbot integration |

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

## Configuration

All clients accept a configuration object:

```typescript
interface ClientConfig {
  baseUrl: string;      // AI service URL
  apiKey?: string;      // API key for authentication
  timeout?: number;     // Request timeout in ms (default: 30000)
  retries?: number;     // Number of retries (default: 3)
}
```
