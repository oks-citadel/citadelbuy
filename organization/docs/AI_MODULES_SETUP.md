# AI Modules Setup Guide

## Current Status

The AI modules are currently **excluded** from TypeScript compilation in `apps/api/tsconfig.json` due to pending type fixes. The modules are fully implemented but require additional configuration to enable.

## AI Modules Available

| Module | Description | Status |
|--------|-------------|--------|
| `fraud-detection` | Transaction and account fraud analysis | Needs type fixes |
| `smart-search` | Intelligent search with autocomplete | Needs type fixes |
| `chatbot` | AI customer service chatbot | Needs LLM integration |
| `content-generation` | Product descriptions, SEO | Needs type fixes |
| `visual-search` | Image-based product search | Needs TensorFlow setup |
| `ar-tryon` | Augmented reality try-on | Needs AR SDK |
| `personalization` | User behavior recommendations | Ready |
| `cart-abandonment` | Cart recovery strategies | Needs type fixes |
| `demand-forecasting` | Inventory optimization | Ready |
| `pricing-engine` | Dynamic pricing | Ready |
| `conversational` | Natural language interface | Needs type fixes |
| `subscription` | Churn prediction | Needs type fixes |
| `revenue-optimization` | Revenue strategies | Ready |

## Prerequisites

1. **Install Dependencies**
   ```bash
   cd apps/api
   pnpm add natural @tensorflow/tfjs-node @tensorflow-models/mobilenet sharp openai
   pnpm add -D @types/multer @types/natural
   ```

2. **Configure API Keys** in `.env`:
   ```env
   # OpenAI (Required for chatbot, content generation)
   OPENAI_API_KEY=sk-your-openai-key

   # Google Cloud (Required for visual search)
   GOOGLE_CLOUD_PROJECT_ID=your-project-id
   GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json

   # Anthropic Claude (Optional, alternative LLM)
   ANTHROPIC_API_KEY=your-anthropic-key
   ```

3. **Enable Feature Flags** in `.env`:
   ```env
   AI_ENABLED=true
   AI_FRAUD_DETECTION_ENABLED=true
   AI_SMART_SEARCH_ENABLED=true
   AI_RECOMMENDATIONS_ENABLED=true
   AI_CHATBOT_ENABLED=true
   AI_VISUAL_SEARCH_ENABLED=true
   AI_AR_TRYON_ENABLED=true
   ```

## Enabling AI Modules

### Step 1: Fix Type Errors

The main issues are:
- Missing `Express.Multer.File` types (install `@types/multer`)
- Implicit `any` types in callbacks (add explicit types)
- Property access on Prisma models (update queries to include relations)

### Step 2: Update tsconfig.json

Remove the AI exclusion:
```json
{
  "exclude": ["node_modules", "dist", "test", "**/*.spec.ts"]
}
```

### Step 3: Register AI Modules in AppModule

The AI modules are conditionally loaded based on the `AI_ENABLED` feature flag in `app.module.ts`.

### Step 4: Run Type Check

```bash
cd apps/api
npx tsc --noEmit
```

## API Endpoints

Once enabled, the following endpoints become available:

### Smart Search
- `POST /api/ai/search` - Intelligent product search
- `GET /api/ai/search/autocomplete?q=query` - Search suggestions

### Chatbot
- `POST /api/ai/chatbot/message` - Send message to AI assistant
- `GET /api/ai/chatbot/history/:sessionId` - Get conversation history

### Visual Search
- `POST /api/ai/visual-search/upload` - Search by image

### Fraud Detection
- `POST /api/ai/fraud/analyze` - Analyze transaction for fraud

### Content Generation
- `POST /api/ai/content/generate` - Generate product descriptions

## Testing

```bash
# Test chatbot
curl -X POST http://localhost:4000/api/ai/chatbot/message \
  -H "Content-Type: application/json" \
  -d '{"message": "What are your best selling products?"}'

# Test smart search
curl -X POST http://localhost:4000/api/ai/search \
  -H "Content-Type: application/json" \
  -d '{"query": "red sneakers size 10"}'
```

## Troubleshooting

### TensorFlow Errors
If you see TensorFlow-related errors:
```bash
npm rebuild @tensorflow/tfjs-node
```

### Memory Issues
TensorFlow models can be memory-intensive. Ensure adequate RAM or use:
```env
NODE_OPTIONS=--max-old-space-size=4096
```

### GPU Acceleration
For faster inference, install GPU support:
```bash
pnpm add @tensorflow/tfjs-node-gpu
```
