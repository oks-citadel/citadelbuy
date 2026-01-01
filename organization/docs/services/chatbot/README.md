# Chatbot Service

## Overview

The Chatbot Service is Broxiva's AI-powered conversational assistant that provides customer support and shopping assistance. Built with advanced NLP models and dialogue management, it handles customer inquiries, product recommendations, order tracking, and seamlessly escalates to human support when needed.

## Key Features

### Conversational AI
- **Intent Classification**: Accurately identify customer intent from natural language
- **Entity Extraction**: Extract key information (product names, order IDs, dates)
- **Dialogue Management**: Maintain context across multi-turn conversations
- **Multi-language Support**: Serve customers in multiple languages

### Shopping Assistance
- **Product Search**: Help customers find products through conversation
- **Recommendations**: Suggest relevant products based on preferences
- **Product Comparison**: Compare features and prices of multiple products
- **Order Assistance**: Track orders, answer shipping questions

### Customer Support
- **FAQ Answering**: Instant answers to common questions
- **Order Tracking**: Real-time order status updates
- **Returns & Refunds**: Guide customers through return process
- **Account Help**: Assist with account-related queries

### Advanced Features
- **Sentiment Analysis**: Detect customer emotions and frustration
- **WebSocket Support**: Real-time chat with instant responses
- **Human Escalation**: Smart handoff to human agents when needed
- **Session History**: Maintain conversation context and history

## Environment Variables

```bash
# Service Configuration
LOG_LEVEL=INFO
PORT=8004

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/broxiva

# Redis Cache
REDIS_URL=redis://localhost:6379/5
REDIS_PASSWORD=your_redis_password

# NLP Models
NLP_MODEL=distilbert-base-uncased
INTENT_MODEL_PATH=/app/models/intent_classifier
ENTITY_MODEL_PATH=/app/models/entity_extractor
SENTIMENT_MODEL_PATH=/app/models/sentiment_analyzer

# OpenAI (for advanced features)
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4-turbo
USE_OPENAI_FALLBACK=true

# Language Support
DEFAULT_LANGUAGE=en
SUPPORTED_LANGUAGES=en,es,fr,de,pt

# Session Management
SESSION_TIMEOUT=3600
MAX_SESSION_HISTORY=100
CONTEXT_WINDOW=10

# Response Generation
MAX_RESPONSE_LENGTH=500
RESPONSE_TIMEOUT=5000
ENABLE_SUGGESTIONS=true
MAX_SUGGESTIONS=3

# Integration
PRODUCT_SERVICE_URL=http://products:8000
ORDER_SERVICE_URL=http://orders:8000
SUPPORT_SERVICE_URL=http://support:8000

# Performance
MAX_CONCURRENT_CHATS=1000
WEBSOCKET_PING_INTERVAL=30
MESSAGE_QUEUE_SIZE=100

# Feature Flags
ENABLE_SENTIMENT_ANALYSIS=true
ENABLE_PRODUCT_RECOMMENDATIONS=true
ENABLE_HUMAN_ESCALATION=true
ENABLE_FEEDBACK_COLLECTION=true
```

## API Endpoints

### Chat
- `POST /chat` - Process chat message and generate response
- `WebSocket /ws/{session_id}` - Real-time WebSocket chat

### NLP Analysis
- `POST /intent/classify` - Classify intent of text
- `POST /entities/extract` - Extract named entities
- `POST /sentiment/analyze` - Analyze sentiment

### Session Management
- `GET /session/{session_id}/history` - Get chat history
- `DELETE /session/{session_id}` - Clear session
- `POST /session/{session_id}/context` - Update session context

### Support
- `POST /escalate` - Escalate to human support
- `POST /feedback` - Submit feedback on response
- `GET /suggestions` - Get conversation suggestions

### Health & Monitoring
- `GET /health` - Service health check
- `GET /metrics` - Prometheus metrics

## Dependencies

### Core Framework
- FastAPI 0.109.0 - Async web framework
- Uvicorn 0.27.0 - ASGI server
- WebSockets 12.0 - WebSocket support
- Pydantic 2.5.3 - Data validation

### Database & Caching
- SQLAlchemy 2.0.25 - ORM
- AsyncPG 0.29.0 - PostgreSQL driver
- Redis 5.0.1 - Session storage
- Hiredis 2.3.2 - Redis client

### NLP & AI
- NumPy 1.26.3 - Numerical computing
- Pandas 2.1.4 - Data manipulation
- Transformers 4.36.2 - NLP models
- PyTorch 2.1.2 - Deep learning
- Sentence-Transformers 2.2.2 - Embeddings

### Language Models
- OpenAI 1.7.2 - GPT integration

### Utilities
- Python-dotenv 1.0.0 - Environment management
- HTTPX 0.26.0 - HTTP client
- PyJWT 2.8.0 - JWT tokens

## Local Development Setup

### Prerequisites
- Python 3.11+
- PostgreSQL 14+
- Redis 7+

### Installation

```bash
# Navigate to service directory
cd organization/apps/services/chatbot

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Download NLP models
python scripts/download_models.py

# Train intent classifier (optional)
python scripts/train_intent_classifier.py

# Initialize database
python scripts/init_db.py

# Start the service
uvicorn src.api:app --reload --port 8004
```

### Development Workflow

```bash
# Run with auto-reload
uvicorn src.api:app --reload --port 8004

# Run tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=src --cov-report=html

# Test NLP models
python tests/nlp/test_intent_classifier.py

# Test chatbot responses
python tests/integration/test_conversation.py
```

## Docker Usage

### Build Image

```bash
# Build the Docker image
docker build -t broxiva/chatbot:latest .

# Build with specific version
docker build -t broxiva/chatbot:v2.0.0 .
```

### Run Container

```bash
# Run standalone
docker run -d \
  --name chatbot \
  -p 8004:8004 \
  --env-file .env \
  -v $(pwd)/models:/app/models \
  broxiva/chatbot:latest

# Run with Docker Compose
docker-compose up chatbot

# View logs
docker logs -f chatbot

# Shell access
docker exec -it chatbot bash
```

### Docker Compose Example

```yaml
services:
  chatbot:
    build: ./organization/apps/services/chatbot
    ports:
      - "8004:8004"
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/broxiva
      - REDIS_URL=redis://redis:6379/5
      - PRODUCT_SERVICE_URL=http://api:3000
    depends_on:
      - db
      - redis
    volumes:
      - ./models:/app/models
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8004/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Testing Instructions

### Unit Tests

```bash
# Run all unit tests
pytest tests/unit/ -v

# Test specific module
pytest tests/unit/test_intent_classifier.py -v

# Run with markers
pytest -m "not slow" -v
```

### Integration Tests

```bash
# Run integration tests
pytest tests/integration/ -v

# Test conversation flows
pytest tests/integration/test_conversations.py -v

# Test with live services
pytest tests/integration/ --live
```

### NLP Model Tests

```bash
# Test intent classification accuracy
python tests/nlp/test_intent_accuracy.py

# Test entity extraction
python tests/nlp/test_entity_extraction.py

# Benchmark NLP performance
python tests/benchmark/nlp_benchmark.py
```

### Load Testing

```bash
# Load test chat endpoint
locust -f tests/load/chat_load.py --host=http://localhost:8004

# WebSocket load test
python tests/load/websocket_load.py
```

## Chat Examples

### HTTP Chat

```bash
curl -X POST http://localhost:8004/chat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "sess_123",
    "user_id": "user_456",
    "message": "I am looking for wireless headphones under $100",
    "language": "en"
  }'
```

Response:
```json
{
  "session_id": "sess_123",
  "response": "I found several wireless headphones under $100. Here are my top recommendations...",
  "intent": "product_search",
  "confidence": 0.95,
  "suggestions": [
    "Show me more details",
    "Compare these products",
    "Add to cart"
  ],
  "products": [
    {"id": "prod_1", "name": "Sony WH-CH510", "price": 59.99},
    {"id": "prod_2", "name": "JBL Tune 500BT", "price": 49.99}
  ]
}
```

### WebSocket Chat

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8004/ws/sess_123');

// Send message
ws.send(JSON.stringify({
  text: 'Where is my order #12345?',
  user_id: 'user_456',
  language: 'en'
}));

// Receive response
ws.onmessage = (event) => {
  const response = JSON.parse(event.data);
  console.log(response.response);
};
```

## Intent Classification

### Supported Intents

- `product_search` - Looking for products
- `product_inquiry` - Questions about specific product
- `recommendation` - Asking for recommendations
- `order_status` - Checking order status
- `shipping_inquiry` - Questions about shipping
- `return_request` - Requesting a return
- `refund_inquiry` - Questions about refunds
- `account_help` - Account-related queries
- `general_inquiry` - General questions
- `greeting` - Hello, hi, etc.
- `farewell` - Goodbye, thanks, etc.

### Custom Intent Training

```python
# Train custom intent classifier
from nlp.intent_classifier import IntentClassifier

classifier = IntentClassifier()
classifier.train(
    training_data=[
        {"text": "I want to return my order", "intent": "return_request"},
        {"text": "Where is my package?", "intent": "order_status"},
        # ... more examples
    ]
)
classifier.save("models/intent_classifier")
```

## Dialogue Management

### Context Tracking

```python
# The dialogue manager maintains context
dialogue_manager.update(
    session_id="sess_123",
    intent="product_search",
    entities={"category": "headphones", "price_max": 100},
    context={"previous_query": "wireless headphones"}
)
```

### Multi-turn Conversations

```
User: I'm looking for headphones
Bot: What type of headphones are you interested in? Over-ear, in-ear, or earbuds?
User: Over-ear
Bot: What's your budget?
User: Around $100
Bot: Great! Here are some over-ear headphones under $100...
```

## Sentiment Analysis

### Detect Customer Emotions

```bash
POST /sentiment/analyze
{
  "text": "I'm very frustrated with the delayed shipping!",
  "language": "en"
}
```

Response:
```json
{
  "text": "I'm very frustrated with the delayed shipping!",
  "sentiment": "negative",
  "score": -0.85,
  "emotions": {
    "anger": 0.7,
    "frustration": 0.9,
    "disappointment": 0.6
  }
}
```

### Escalation Triggers

Automatically escalate to human when:
- Sentiment score < -0.7 (very negative)
- Customer explicitly requests human
- Chatbot confidence < 0.5 for 3+ messages
- Complex issue detected (refunds, disputes)

## Integration with Other Services

### Product Service

```python
# Get product recommendations
from integrations.product_service import get_relevant_products

products = get_relevant_products(
    entities={"category": "electronics"},
    limit=5
)
```

### Order Service

```python
# Track order status
from integrations.order_service import get_order_status

status = get_order_status(order_id="12345")
```

### Support Service

```python
# Escalate to human support
from integrations.support_service import create_support_ticket

ticket = await create_support_ticket(
    session_id="sess_123",
    reason="complex_refund_request"
)
```

## Monitoring & Analytics

### Key Metrics

- **Response Time**: Average time to generate response
- **Intent Accuracy**: Percentage of correctly classified intents
- **Resolution Rate**: Percentage of issues resolved by chatbot
- **Escalation Rate**: Percentage of chats escalated to humans
- **Customer Satisfaction**: Feedback ratings

### Prometheus Metrics

```
# Chat metrics
chatbot_messages_total{intent="product_search"} 10000
chatbot_response_duration_seconds{quantile="0.95"} 0.8

# Quality metrics
chatbot_intent_accuracy 0.92
chatbot_escalation_rate 0.15
```

## Architecture

```
chatbot/
├── src/
│   ├── nlp/                   # NLP processing
│   │   ├── intent_classifier.py
│   │   ├── entity_extractor.py
│   │   ├── sentiment_analyzer.py
│   │   └── language_detector.py
│   ├── dialogue/              # Dialogue management
│   │   ├── dialogue_manager.py
│   │   ├── context_tracker.py
│   │   └── state_machine.py
│   ├── response/              # Response generation
│   │   └── response_generator.py
│   ├── integrations/          # External services
│   │   ├── product_service.py
│   │   ├── order_service.py
│   │   └── support_service.py
│   ├── api/                   # API routers
│   └── utils/                 # Utilities
├── models/                    # NLP models
├── data/                      # Training data
├── notebooks/                 # Analysis notebooks
├── tests/                     # Test suite
├── scripts/                   # Utility scripts
└── Dockerfile                 # Container definition
```

## Best Practices

### Conversation Design
1. Keep responses concise and clear
2. Provide conversation suggestions
3. Confirm important actions
4. Handle edge cases gracefully

### Performance
1. Cache common responses
2. Use async processing
3. Implement message queuing
4. Optimize NLP model inference

### User Experience
1. Set clear expectations
2. Show typing indicators
3. Provide quick reply options
4. Make escalation easy

## Troubleshooting

### Common Issues

**Low Intent Accuracy**
- Retrain with more examples
- Review misclassified intents
- Add domain-specific training data
- Fine-tune model parameters

**Slow Response Time**
- Enable response caching
- Use smaller NLP models
- Optimize inference pipeline
- Scale horizontally

**Poor Conversation Flow**
- Improve dialogue management
- Better context tracking
- Review conversation logs
- A/B test different flows

## API Documentation

Interactive API documentation:
- Swagger UI: http://localhost:8004/docs
- ReDoc: http://localhost:8004/redoc

## Contributing

See [Contributing Guide](../../../CONTRIBUTING.md) for development guidelines.

## License

Proprietary - Broxiva Platform

## Support

For issues and questions:
- Internal Slack: #chatbot-support
- Email: support@broxiva.com
