# CitadelBuy AI-Powered Customer Support Chatbot

## Overview

This n8n workflow provides an intelligent, multi-channel customer support chatbot powered by OpenAI GPT-4 and Pinecone RAG (Retrieval Augmented Generation). It handles customer inquiries across web chat, WhatsApp, Telegram, and email with automated responses and intelligent escalation to human agents.

## Features

### Multi-Channel Support
- **Web Chat**: Real-time chat widget integration
- **WhatsApp**: Via Twilio Business API
- **Telegram**: Direct bot integration
- **Email**: Via SendGrid Inbound Parse

### AI Capabilities
- **Intent Classification**: GPT-4 powered intent recognition
- **RAG Search**: Pinecone vector search for product/FAQ knowledge
- **Sentiment Analysis**: Automatic sentiment scoring (-1.0 to 1.0)
- **Context Awareness**: Maintains conversation history
- **Confidence Scoring**: Self-assessment of response quality

### Automated Responses
- **Order Tracking**: Real-time order status from CitadelBuy API
- **Product Questions**: RAG-powered product information
- **Return/Refund**: Policy information and process guidance
- **Shipping Inquiries**: ShipStation tracking integration
- **General Questions**: Platform and policy information

### Intelligent Escalation
Automatically creates Zendesk tickets when:
- Sentiment score < -0.5 (negative customer emotion)
- Confidence score < 0.7 (AI unsure of response)
- Customer explicitly requests human agent
- VIP/Platinum tier customer
- Order value > $1000
- Complaint detected

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Message Ingestion                         │
│  (Web Chat, WhatsApp, Telegram, Email Webhooks)            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Normalize & Store Message                       │
│         (PostgreSQL Conversation History)                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│         Build Context (History + Customer Profile)           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│      AI Intent Classification (GPT-4 + Sentiment)            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│          Check Escalation Triggers                           │
└──────┬──────────────────────────────────────────┬───────────┘
       │                                            │
       │ Escalate                                   │ Auto-Handle
       ▼                                            ▼
┌──────────────────┐                    ┌─────────────────────┐
│ Create Zendesk   │                    │  Route by Intent:   │
│ Ticket + Notify  │                    │  - Order Status     │
└──────────────────┘                    │  - Product Q        │
                                        │  - Return/Refund    │
                                        │  - Shipping         │
                                        │  - General          │
                                        └──────────┬──────────┘
                                                   │
                                                   ▼
                                        ┌─────────────────────┐
                                        │ Generate AI Response │
                                        │ (GPT-4 + RAG/APIs)  │
                                        └──────────┬──────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────┐
│      Store Response & Route to Channel                       │
│  (Web Chat, WhatsApp, Telegram, Email)                      │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Required Services
1. **n8n**: Self-hosted or cloud instance (v1.0+)
2. **OpenAI API**: GPT-4 Turbo access
3. **Pinecone**: Vector database for RAG
4. **PostgreSQL**: Conversation history storage
5. **Zendesk**: Ticket management
6. **Twilio**: WhatsApp Business API
7. **Telegram Bot API**: Bot token
8. **SendGrid**: Email sending/receiving

### API Credentials Needed
- OpenAI API Key
- Pinecone API Key + Environment + Index Name
- PostgreSQL Connection String
- Zendesk Subdomain + API Token
- Twilio Account SID + Auth Token
- Telegram Bot Token
- SendGrid API Key
- CitadelBuy API Key
- ShipStation API Key + Secret

## Installation

### Step 1: Import Workflow

1. Open n8n UI
2. Go to **Workflows** → **Import from File**
3. Select `workflow-02-ai-chatbot.json`
4. Click **Import**

### Step 2: Configure Credentials

#### PostgreSQL (ID: 1)
```
Host: your-postgres-host
Database: citadelbuy
User: n8n_user
Password: your-password
Port: 5432
SSL: Enabled
```

Create required tables:
```sql
-- Conversation history
CREATE TABLE conversation_history (
    id SERIAL PRIMARY KEY,
    conversation_id VARCHAR(255) NOT NULL,
    customer_id VARCHAR(255),
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    channel VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    sender VARCHAR(20) NOT NULL, -- 'customer' or 'assistant'
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB,
    INDEX idx_conversation_id (conversation_id),
    INDEX idx_customer_email (customer_email),
    INDEX idx_timestamp (timestamp)
);

-- Workflow analytics
CREATE TABLE workflow_analytics (
    id SERIAL PRIMARY KEY,
    workflow_name VARCHAR(100),
    execution_id VARCHAR(255),
    channel VARCHAR(50),
    intent VARCHAR(100),
    confidence FLOAT,
    sentiment FLOAT,
    response_time_ms INTEGER,
    is_escalated BOOLEAN DEFAULT FALSE,
    error BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    INDEX idx_workflow_timestamp (workflow_name, timestamp)
);

-- Customer profiles (if not exists)
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    name VARCHAR(255),
    customer_tier VARCHAR(50) DEFAULT 'Standard',
    total_orders INTEGER DEFAULT 0,
    lifetime_value DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### OpenAI API (ID: 2)
```
API Key: sk-proj-...
Organization ID: (optional)
```

#### CitadelBuy API (ID: 3)
```
Type: Header Auth
Header Name: X-API-Key
Header Value: your-citadelbuy-api-key
```

#### Pinecone API (ID: 4)
```
API Key: your-pinecone-api-key
Environment: us-west1-gcp
Index Name: citadelbuy-products
```

#### Zendesk API (ID: 6)
```
Subdomain: your-subdomain
Email: admin@citadelbuy.com
API Token: your-zendesk-token
```

#### Twilio API (ID: 7)
```
Account SID: ACxxxxx
Auth Token: your-auth-token
```

#### Telegram Bot API (ID: 8)
```
Bot Token: 123456789:ABCdefGHIjklMNOpqrSTUvwxyz
```

#### SendGrid SMTP (ID: 9)
```
Host: smtp.sendgrid.net
Port: 587
User: apikey
Password: SG.xxxxx
```

### Step 3: Setup Pinecone RAG Index

#### Create Pinecone Index
```bash
# Install Pinecone CLI
pip install pinecone-client

# Create index
python setup_pinecone.py
```

**setup_pinecone.py**:
```python
import pinecone
from openai import OpenAI
import os

# Initialize Pinecone
pinecone.init(
    api_key=os.getenv("PINECONE_API_KEY"),
    environment="us-west1-gcp"
)

# Create index with OpenAI embeddings dimension (1536)
pinecone.create_index(
    name="citadelbuy-products",
    dimension=1536,
    metric="cosine",
    pod_type="p1"
)

print("Index created successfully!")
```

#### Populate Vector Database

Create and run the data ingestion script:

**ingest_knowledge_base.py**:
```python
import pinecone
from openai import OpenAI
import json
import os
from typing import List, Dict

# Initialize clients
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
pinecone.init(
    api_key=os.getenv("PINECONE_API_KEY"),
    environment="us-west1-gcp"
)
index = pinecone.Index("citadelbuy-products")

def create_embedding(text: str) -> List[float]:
    """Generate embedding using OpenAI"""
    response = client.embeddings.create(
        input=text,
        model="text-embedding-ada-002"
    )
    return response.data[0].embedding

def ingest_products(products: List[Dict]):
    """Ingest product data into Pinecone"""
    vectors = []

    for product in products:
        # Create searchable text
        text = f"""
        Product: {product['name']}
        Category: {product['category']}
        Description: {product['description']}
        Price: ${product['price']}
        Availability: {product['stock_status']}
        Features: {', '.join(product.get('features', []))}
        Reviews: {product.get('avg_rating', 'N/A')} stars
        """

        # Generate embedding
        embedding = create_embedding(text)

        # Prepare vector
        vectors.append({
            'id': f"product_{product['id']}",
            'values': embedding,
            'metadata': {
                'type': 'product',
                'product_id': product['id'],
                'name': product['name'],
                'price': product['price'],
                'url': product['url'],
                'stock_status': product['stock_status'],
                'category': product['category']
            }
        })

    # Upsert in batches
    batch_size = 100
    for i in range(0, len(vectors), batch_size):
        batch = vectors[i:i+batch_size]
        index.upsert(vectors=batch)
        print(f"Uploaded batch {i//batch_size + 1}")

def ingest_faqs(faqs: List[Dict]):
    """Ingest FAQ data into Pinecone"""
    vectors = []

    for faq in faqs:
        text = f"Question: {faq['question']}\nAnswer: {faq['answer']}"
        embedding = create_embedding(text)

        vectors.append({
            'id': f"faq_{faq['id']}",
            'values': embedding,
            'metadata': {
                'type': 'faq',
                'question': faq['question'],
                'answer': faq['answer'],
                'category': faq['category']
            }
        })

    index.upsert(vectors=vectors)
    print(f"Uploaded {len(faqs)} FAQs")

# Example usage
if __name__ == "__main__":
    # Load from CitadelBuy API
    import requests

    # Fetch products
    products_response = requests.get(
        "https://api.citadelbuy.com/v1/products",
        headers={"X-API-Key": os.getenv("CITADELBUY_API_KEY")}
    )
    products = products_response.json()['data']

    # Fetch FAQs
    faqs_response = requests.get(
        "https://api.citadelbuy.com/v1/support/faqs",
        headers={"X-API-Key": os.getenv("CITADELBUY_API_KEY")}
    )
    faqs = faqs_response.json()['data']

    # Ingest data
    print("Ingesting products...")
    ingest_products(products)

    print("Ingesting FAQs...")
    ingest_faqs(faqs)

    print("✅ Knowledge base ingestion complete!")
```

Run ingestion:
```bash
python ingest_knowledge_base.py
```

### Step 4: Configure Webhooks

#### Web Chat Widget
Add to your website:
```html
<script>
window.citadelChat = {
  apiUrl: 'https://your-n8n-instance.com/webhook/chat-webhook',
  onSend: async (message) => {
    const response = await fetch(window.citadelChat.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: 'web',
        message: message,
        sessionId: localStorage.getItem('chatSessionId') || generateSessionId(),
        userId: getUserId(),
        email: getUserEmail(),
        name: getUserName(),
        userAgent: navigator.userAgent,
        ip: await getUserIP(),
        pageUrl: window.location.href
      })
    });
    return response.json();
  }
};
</script>
```

#### WhatsApp via Twilio
1. Go to Twilio Console → WhatsApp Sandbox
2. Set Webhook URL: `https://your-n8n-instance.com/webhook/whatsapp-webhook`
3. Method: POST
4. Save configuration

#### Telegram Bot
```bash
# Set webhook
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -d "url=https://your-n8n-instance.com/webhook/telegram-webhook"
```

#### Email via SendGrid Inbound Parse
1. Go to SendGrid → Settings → Inbound Parse
2. Add new hostname/URL
3. Hostname: `support.citadelbuy.com`
4. URL: `https://your-n8n-instance.com/webhook/email-webhook`
5. Check "POST the raw, full MIME message"

### Step 5: Activate Workflow

1. In n8n UI, open the imported workflow
2. Click **Activate** toggle in top right
3. Test each webhook endpoint

## Testing

### Test Web Chat
```bash
curl -X POST https://your-n8n-instance.com/webhook/chat-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "web",
    "message": "What is the status of order #12345?",
    "sessionId": "test-session-123",
    "email": "customer@example.com",
    "name": "Test Customer"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Let me check order #12345 for you...",
  "conversationId": "test-session-123",
  "sentiment": 0.2,
  "isEscalated": false
}
```

### Test WhatsApp
Send a WhatsApp message to your Twilio number from the Sandbox.

### Test Telegram
Send `/start` to your bot, then ask a question.

### Test RAG Search
```bash
curl -X POST https://your-n8n-instance.com/webhook/chat-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "web",
    "message": "Do you have wireless headphones under $100?",
    "sessionId": "test-rag-456",
    "email": "test@example.com"
  }'
```

## Monitoring & Analytics

### View Conversation History
```sql
SELECT
    conversation_id,
    channel,
    customer_name,
    COUNT(*) as message_count,
    MAX(timestamp) as last_message
FROM conversation_history
GROUP BY conversation_id, channel, customer_name
ORDER BY last_message DESC
LIMIT 20;
```

### Check Escalation Rate
```sql
SELECT
    DATE(timestamp) as date,
    channel,
    COUNT(*) as total_conversations,
    SUM(CASE WHEN is_escalated THEN 1 ELSE 0 END) as escalations,
    ROUND(100.0 * SUM(CASE WHEN is_escalated THEN 1 ELSE 0 END) / COUNT(*), 2) as escalation_rate
FROM workflow_analytics
WHERE workflow_name = 'ai-chatbot'
GROUP BY DATE(timestamp), channel
ORDER BY date DESC;
```

### Average Sentiment by Channel
```sql
SELECT
    channel,
    ROUND(AVG(sentiment), 3) as avg_sentiment,
    ROUND(AVG(confidence), 3) as avg_confidence,
    COUNT(*) as conversations
FROM workflow_analytics
WHERE workflow_name = 'ai-chatbot'
  AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY channel;
```

## Customization

### Modify AI System Prompt
Edit the **AI Intent Classification** node:
```javascript
{
  "role": "system",
  "content": "Your custom system prompt here..."
}
```

### Add New Intent Type
1. Update AI Classification system prompt to include new intent
2. Add new Switch node for routing
3. Create data fetching node (API/RAG)
4. Add response generation node

### Adjust Escalation Triggers
Edit **Parse Intent & Check Escalation** node:
```javascript
const isVIP = customerProfile.customer_tier === 'VIP';
const highValue = customerProfile.lifetime_value > 1000; // Change threshold
const lowConfidence = aiData.confidence < 0.7; // Adjust confidence threshold
const negativeSentiment = aiData.sentiment < -0.5; // Adjust sentiment threshold
```

### Customize Response Templates
Edit individual **Generate [Type] Response** nodes to adjust tone, length, or format.

## RAG Knowledge Base Maintenance

### Update Product Information
```bash
# Run incremental update
python update_pinecone.py --incremental

# Full re-index
python update_pinecone.py --full-reindex
```

### Monitor RAG Performance
```python
# Check index stats
import pinecone
pinecone.init(api_key="...", environment="...")
index = pinecone.Index("citadelbuy-products")
stats = index.describe_index_stats()
print(f"Total vectors: {stats['total_vector_count']}")
```

### Query Testing
```python
# Test similarity search
query = "wireless bluetooth headphones"
embedding = create_embedding(query)
results = index.query(embedding, top_k=5, include_metadata=True)
for match in results['matches']:
    print(f"{match['metadata']['name']} - Score: {match['score']}")
```

## Troubleshooting

### Issue: Low Confidence Scores
**Solution**:
- Expand RAG knowledge base
- Add more training examples to system prompt
- Adjust confidence threshold in escalation logic

### Issue: High Escalation Rate
**Causes**:
- Sentiment threshold too sensitive
- Knowledge base gaps
- Intent classification accuracy

**Solution**:
- Review escalated conversations
- Add missing content to Pinecone
- Retrain intent examples

### Issue: Slow Response Times
**Solution**:
- Enable Pinecone caching
- Use GPT-4-turbo instead of GPT-4
- Optimize database queries
- Add Redis caching layer

### Issue: RAG Returns Irrelevant Results
**Solution**:
- Improve embedding quality (more context in text)
- Adjust top_k parameter (currently 5)
- Use metadata filtering in Pinecone queries
- Re-chunk documents into smaller segments

## Performance Optimization

### Enable Response Caching
Add a Redis node before AI responses:
```javascript
// Check cache
const cacheKey = `response:${hash(message)}`;
const cached = await redis.get(cacheKey);
if (cached) return JSON.parse(cached);

// ... generate response ...

// Store in cache (1 hour TTL)
await redis.setex(cacheKey, 3600, JSON.stringify(response));
```

### Batch Vector Searches
Modify Pinecone node to search multiple queries:
```python
# Instead of sequential searches, batch similar intents
queries = [embed(msg) for msg in similar_messages]
results = index.query(queries, top_k=3)
```

### Async Processing
For non-urgent channels (email), use async processing:
- Webhook responds immediately with "We'll get back to you"
- Actual processing happens in background
- Send response via email later

## Cost Estimation

### OpenAI Costs (GPT-4 Turbo)
- Intent Classification: ~300 tokens/request
- Response Generation: ~500 tokens/request
- Cost: ~$0.03 per conversation
- **Monthly (10,000 conversations)**: ~$300

### Pinecone Costs
- p1 pod: $70/month
- Storage: Included (up to 5M vectors)

### Total Monthly Cost
- OpenAI: $300
- Pinecone: $70
- **Total**: ~$370/month for 10,000 conversations

## Best Practices

1. **Regular Knowledge Base Updates**: Schedule weekly Pinecone updates
2. **Monitor Sentiment Trends**: Alert on declining sentiment
3. **Review Escalations**: Weekly review of escalated tickets
4. **A/B Test Prompts**: Experiment with different system prompts
5. **Customer Feedback Loop**: Ask "Was this helpful?" after responses
6. **Conversation Analytics**: Track resolution rate by intent type
7. **Rate Limiting**: Implement per-customer rate limits
8. **Fallback Responses**: Always have graceful error messages

## Security Considerations

- **PII Protection**: Never log sensitive customer data in plain text
- **API Key Rotation**: Rotate all API keys quarterly
- **Webhook Authentication**: Use HMAC signatures for webhooks
- **Rate Limiting**: Prevent abuse with per-IP limits
- **Input Sanitization**: Validate all incoming messages
- **Output Filtering**: Remove sensitive data from AI responses

## Support

For issues with this workflow:
1. Check n8n execution logs
2. Review PostgreSQL query logs
3. Check OpenAI API status
4. Verify Pinecone index health
5. Contact: support@citadelbuy.com

## License

Proprietary - CitadelBuy Internal Use Only

---

**Version**: 1.0.0
**Last Updated**: 2025-12-03
**Maintained By**: CitadelBuy DevOps Team
