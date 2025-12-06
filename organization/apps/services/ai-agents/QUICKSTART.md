# Quick Start Guide - AI Agents Service

Get the AI Agents service running in 5 minutes!

## Prerequisites

- Python 3.11+
- OpenAI API key
- Redis (optional for full features)

## 1. Install Dependencies

```bash
cd organization/apps/services/ai-agents
pip install -r requirements.txt
```

## 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:
```bash
OPENAI_API_KEY=sk-your-key-here
```

## 3. Run the Service

```bash
python main.py
```

The service will start on `http://localhost:8020`

## 4. Test the API

### Check Health
```bash
curl http://localhost:8020/health
```

### List Available Agents
```bash
curl http://localhost:8020/agents
```

### Invoke an Agent

**Marketing Campaign Optimization:**
```bash
curl -X POST http://localhost:8020/api/v1/agents/marketing/campaign \
  -H "Content-Type: application/json" \
  -d '{
    "campaign_type": "social",
    "target_regions": ["North America", "Europe"],
    "product_ids": ["prod_123"],
    "budget": 10000.00,
    "duration_days": 30,
    "objectives": ["brand_awareness", "conversions"]
  }'
```

**Pricing Optimization:**
```bash
curl -X POST http://localhost:8020/api/v1/agents/pricing/optimize \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "prod_123",
    "current_price": 99.99,
    "cost": 60.00,
    "market_data": {
      "competitor_average": 105.00,
      "demand_level": 1.2
    },
    "strategy": "dynamic"
  }'
```

**Execute a Workflow:**
```bash
curl -X POST http://localhost:8020/api/v1/workflow/execute \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_name": "product_launch",
    "input_data": {
      "product_id": "prod_123",
      "target_markets": ["US", "UK", "DE"]
    },
    "agents": ["pricing", "competitor", "content", "marketing"],
    "execution_mode": "sequential"
  }'
```

## 5. View API Documentation

Open in your browser:
- **Swagger UI:** http://localhost:8020/docs
- **ReDoc:** http://localhost:8020/redoc

## Using Docker

### Quick Start with Docker Compose

```bash
# Start all services (ai-agents, redis, postgres)
docker-compose up -d

# View logs
docker-compose logs -f ai-agents

# Stop services
docker-compose down
```

### Single Container

```bash
# Build
docker build -t ai-agents:latest .

# Run
docker run -d \
  -p 8020:8020 \
  -e OPENAI_API_KEY=sk-your-key \
  --name ai-agents \
  ai-agents:latest
```

## Testing Individual Agents

### 1. Marketing Manager
```python
import requests

response = requests.post(
    "http://localhost:8020/api/v1/agents/marketing/campaign",
    json={
        "campaign_type": "email",
        "target_regions": ["North America"],
        "product_ids": ["prod_123"],
        "budget": 5000.00,
        "duration_days": 14,
        "objectives": ["conversions"]
    }
)
print(response.json())
```

### 2. Fraud Detection
```python
response = requests.post(
    "http://localhost:8020/api/v1/agents/fraud/analyze",
    json={
        "transaction_id": "txn_123",
        "user_id": "user_456",
        "amount": 1500.00,
        "transaction_type": "purchase",
        "metadata": {"ip": "192.168.1.1"}
    }
)
print(response.json())
```

### 3. Content Generation
```python
response = requests.post(
    "http://localhost:8020/api/v1/agents/content/generate",
    json={
        "content_type": "product_description",
        "target_languages": ["en", "es", "fr"],
        "keywords": ["laptop", "gaming", "performance"],
        "tone": "professional",
        "length": "medium"
    }
)
print(response.json())
```

## Workflow Examples

### Product Launch
```python
response = requests.post(
    "http://localhost:8020/api/v1/workflow/execute",
    json={
        "workflow_name": "product_launch",
        "input_data": {
            "product_id": "prod_new_123",
            "product_name": "UltraBook Pro",
            "category": "Electronics"
        },
        "agents": ["pricing", "competitor", "content", "localization", "marketing"],
        "execution_mode": "sequential"
    }
)
print(response.json())
```

### Vendor Onboarding
```python
response = requests.post(
    "http://localhost:8020/api/v1/workflow/execute",
    json={
        "workflow_name": "vendor_onboarding",
        "input_data": {
            "vendor_id": "vendor_new_456",
            "business_name": "Tech Supplies Inc",
            "country": "United States"
        },
        "agents": ["vendor", "compliance", "fraud", "trade"],
        "execution_mode": "sequential"
    }
)
print(response.json())
```

## Common Issues

### Issue: "Module not found"
**Solution:** Ensure you're in the correct directory and dependencies are installed:
```bash
cd organization/apps/services/ai-agents
pip install -r requirements.txt
```

### Issue: "OpenAI API key not configured"
**Solution:** Set your API key in `.env`:
```bash
OPENAI_API_KEY=sk-your-actual-key-here
```

### Issue: "Redis connection failed"
**Solution:** Either:
1. Install and run Redis locally: `redis-server`
2. Or use Docker: `docker run -d -p 6379:6379 redis:7-alpine`
3. Or disable Redis features (service will work with reduced functionality)

### Issue: Port 8020 already in use
**Solution:** Change the port in `.env`:
```bash
PORT=8021
```

## Next Steps

1. **Explore the API:** Visit http://localhost:8020/docs
2. **Read the docs:** Check README.md for detailed documentation
3. **Test workflows:** Try the predefined workflows
4. **Integrate:** Connect to your main application
5. **Monitor:** Set up Sentry and Prometheus for production

## Getting Help

- **Documentation:** See README.md
- **API Reference:** http://localhost:8020/docs
- **Implementation Details:** See IMPLEMENTATION_SUMMARY.md

## Production Deployment

See README.md section "Production Deployment" for:
- Kubernetes manifests
- Scaling strategies
- High availability setup
- Monitoring configuration

---

**You're all set!** The AI Agents service is now running and ready to process requests.
