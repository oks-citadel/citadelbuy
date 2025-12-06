# AI Agents Service - CitadelBuy Global B2B Enterprise Marketplace

Enterprise-grade AI agents service providing 12 intelligent agents for global marketplace operations.

## Overview

The AI Agents Service is a sophisticated multi-agent system designed to handle complex enterprise operations across the CitadelBuy platform. It leverages OpenAI GPT-4 and Anthropic Claude for advanced reasoning, combined with custom business logic for specialized tasks.

## Architecture

```
ai-agents/
├── main.py                 # FastAPI application with all endpoints
├── config.py              # Configuration management
├── agents/                # Individual agent implementations
│   ├── base_agent.py      # Base class for all agents
│   ├── marketing_manager.py
│   ├── trade_specialist.py
│   ├── pricing_advisor.py
│   ├── sales_director.py
│   ├── vendor_verification.py
│   ├── compliance_officer.py
│   ├── fraud_analyst.py
│   ├── logistics_forecasting.py
│   ├── competitor_analysis.py
│   ├── content_writer.py
│   ├── localization_manager.py
│   └── conversion_optimizer.py
├── orchestrator/          # Multi-agent coordination
│   ├── coordinator.py     # Agent coordination logic
│   ├── workflows.py       # Predefined workflows
│   └── memory.py         # Shared memory/context
└── utils/                # Utility functions
```

## The 12 AI Agents

### 1. Global Marketing Manager Agent
**Capabilities:**
- Campaign optimization across global markets
- Regional targeting and budget allocation
- Channel mix recommendations
- ROI forecasting
- A/B test suggestions

**API Endpoint:** `POST /api/v1/agents/marketing/campaign`

**Example Request:**
```json
{
  "campaign_type": "social",
  "target_regions": ["North America", "Europe", "Asia Pacific"],
  "product_ids": ["prod_123", "prod_456"],
  "budget": 50000.00,
  "duration_days": 30,
  "objectives": ["brand_awareness", "conversions"]
}
```

### 2. Cross-Border Trade Specialist Agent
**Capabilities:**
- Trade compliance checking
- HS code classification
- Tariff calculation
- Export/import documentation
- Sanctions screening
- Customs clearance guidance

**API Endpoint:** `POST /api/v1/agents/trade/compliance`

**Example Request:**
```json
{
  "origin_country": "United States",
  "destination_country": "Germany",
  "product_category": "Electronics",
  "hs_code": "8471.30.01",
  "value_usd": 5000.00,
  "quantity": 10
}
```

### 3. Pricing & Profitability Advisor Agent
**Capabilities:**
- Dynamic pricing optimization
- Margin analysis
- Competitive pricing strategies
- Price elasticity analysis
- Profitability forecasting
- Discount optimization

**API Endpoint:** `POST /api/v1/agents/pricing/optimize`

**Example Request:**
```json
{
  "product_id": "prod_123",
  "current_price": 99.99,
  "cost": 60.00,
  "market_data": {
    "competitor_average": 105.00,
    "demand_level": 1.2
  },
  "target_margin": 0.35,
  "strategy": "dynamic"
}
```

### 4. Enterprise Sales Director Agent
**Capabilities:**
- Deal scoring and win probability
- Sales forecasting
- Pipeline analysis
- Revenue prediction
- Churn prediction
- Next best action recommendations

**API Endpoint:** `POST /api/v1/agents/sales/score-deal`

**Example Request:**
```json
{
  "deal_id": "deal_789",
  "customer_id": "cust_456",
  "products": [{"id": "prod_123", "quantity": 100}],
  "total_value": 10000.00,
  "stage": "negotiation",
  "interactions": [...]
}
```

### 5. Vendor Verification Assistant Agent
**Capabilities:**
- KYB (Know Your Business) verification
- Document verification
- Business registry checking
- Sanctions screening
- Risk assessment
- Compliance monitoring

**API Endpoint:** `POST /api/v1/agents/vendor/verify`

**Example Request:**
```json
{
  "vendor_id": "vendor_123",
  "business_name": "Acme Corp",
  "country": "United States",
  "business_registration_number": "12345678",
  "documents": [...],
  "trade_history": {...}
}
```

### 6. Global Compliance Officer Agent
**Capabilities:**
- GDPR compliance checking
- Trade compliance monitoring
- Tax compliance verification
- Data privacy audits
- Regulatory updates tracking
- Risk alerts

**API Endpoint:** `POST /api/v1/agents/compliance/check`

**Example Request:**
```json
{
  "entity_type": "vendor",
  "entity_id": "vendor_123",
  "jurisdiction": "EU",
  "compliance_areas": ["gdpr", "trade", "tax"]
}
```

### 7. Risk & Fraud Detection Analyst Agent
**Capabilities:**
- Transaction fraud detection
- Risk scoring
- Pattern analysis
- Anomaly detection
- Velocity checking
- Device fingerprinting

**API Endpoint:** `POST /api/v1/agents/fraud/analyze`

**Example Request:**
```json
{
  "transaction_id": "txn_456",
  "user_id": "user_789",
  "amount": 5000.00,
  "transaction_type": "purchase",
  "metadata": {...}
}
```

### 8. Logistics Forecasting Agent
**Capabilities:**
- Delivery time prediction
- Route optimization
- Carrier selection
- Cost optimization
- Tracking prediction
- Delay forecasting

**API Endpoint:** `POST /api/v1/agents/logistics/forecast`

**Example Request:**
```json
{
  "order_id": "order_123",
  "origin": {"country": "US", "city": "New York"},
  "destination": {"country": "UK", "city": "London"},
  "items": [...],
  "shipping_method": "express"
}
```

### 9. Competitor Analysis Agent
**Capabilities:**
- Price monitoring
- Market intelligence
- Feature comparison
- Sentiment analysis
- Market share analysis
- Competitive positioning

**API Endpoint:** `POST /api/v1/agents/competitor/analyze`

**Example Request:**
```json
{
  "product_id": "prod_123",
  "category": "Electronics",
  "region": "North America",
  "competitor_urls": ["https://competitor1.com/product", ...],
  "analysis_depth": "deep"
}
```

### 10. Multi-Language Content Writer Agent
**Capabilities:**
- Content generation in 15+ languages
- SEO optimization
- Tone adaptation
- Copywriting
- Product descriptions
- Marketing content

**API Endpoint:** `POST /api/v1/agents/content/generate`

**Example Request:**
```json
{
  "content_type": "product_description",
  "target_languages": ["en", "es", "fr", "de"],
  "keywords": ["laptop", "high-performance", "gaming"],
  "tone": "professional",
  "length": "medium"
}
```

### 11. Localization Manager Agent
**Capabilities:**
- Translation quality assurance
- Cultural adaptation
- Locale management
- Terminology consistency
- Linguistic testing
- Regional variant handling

**API Endpoint:** `POST /api/v1/agents/localization/translate`

**Example Request:**
```json
{
  "content": "Your order has been shipped...",
  "source_language": "en",
  "target_languages": ["es", "fr", "de", "zh"],
  "domain": "ecommerce",
  "cultural_adaptation": true
}
```

### 12. Conversion Optimization Agent
**Capabilities:**
- A/B testing design
- Funnel analysis
- CRO recommendations
- Heatmap analysis
- User flow optimization
- Landing page optimization

**API Endpoint:** `POST /api/v1/agents/conversion/optimize`

**Example Request:**
```json
{
  "page_type": "checkout",
  "current_metrics": {
    "conversion_rate": 0.025,
    "bounce_rate": 0.45
  },
  "traffic_data": {...}
}
```

## Multi-Agent Orchestration

The service includes powerful orchestration capabilities for coordinating multiple agents:

### Generic Agent Invocation
```bash
POST /api/v1/agents/invoke
```

### Workflow Execution
```bash
POST /api/v1/workflow/execute
```

### Predefined Workflows

1. **Product Launch Workflow**
   - Agents: Pricing → Competitor → Content → Localization → Marketing
   - Use case: Launch new product to global market

2. **Vendor Onboarding Workflow**
   - Agents: Vendor Verification → Compliance → Fraud → Trade
   - Use case: Onboard and verify new supplier

3. **Order Processing Workflow**
   - Agents: Fraud Detection → Trade Compliance → Logistics
   - Use case: Validate and process customer order

4. **Market Expansion Workflow**
   - Agents: Competitor → Compliance → Pricing → Marketing → Localization
   - Use case: Enter new geographic market

5. **Compliance Audit Workflow**
   - Agents: Compliance → Vendor → Trade → Fraud
   - Use case: Comprehensive compliance review

6. **Sales Campaign Workflow**
   - Agents: Sales → Pricing → Content → Marketing → Conversion
   - Use case: Execute targeted sales initiative

## Installation & Setup

### Prerequisites
- Python 3.11+
- Redis (for shared memory)
- PostgreSQL (optional, for persistence)
- OpenAI API key
- Anthropic API key (optional)

### Local Development

1. **Clone and navigate:**
```bash
cd organization/apps/services/ai-agents
```

2. **Create virtual environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies:**
```bash
pip install -r requirements.txt
```

4. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

5. **Run the service:**
```bash
python main.py
```

The service will be available at `http://localhost:8020`

### Docker Deployment

1. **Build image:**
```bash
docker build -t citadelbuy-ai-agents:latest .
```

2. **Run container:**
```bash
docker run -d \
  -p 8020:8020 \
  -e OPENAI_API_KEY=your_key \
  -e REDIS_HOST=redis \
  --name ai-agents \
  citadelbuy-ai-agents:latest
```

### Docker Compose

```yaml
version: '3.8'

services:
  ai-agents:
    build: .
    ports:
      - "8020:8020"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - REDIS_HOST=redis
      - DATABASE_URL=${DATABASE_URL}
    depends_on:
      - redis
      - postgres

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: citadelbuy
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
```

## API Documentation

### Interactive Documentation
- Swagger UI: `http://localhost:8020/docs`
- ReDoc: `http://localhost:8020/redoc`

### Health Endpoints
```bash
GET /health       # Basic health check
GET /ready        # Readiness check with agent status
GET /agents       # List all available agents
```

### Authentication
The service supports API key authentication (optional in development, required in production):

```bash
curl -H "X-API-Key: your-api-key" http://localhost:8020/api/v1/agents/invoke
```

## Configuration

Key configuration options in `.env`:

```bash
# AI Models
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
ANTHROPIC_API_KEY=sk-ant-...

# Performance
MAX_CONCURRENT_AGENTS=5
AGENT_TIMEOUT_SECONDS=300

# Execution
DEFAULT_EXECUTION_MODE=sequential  # or parallel
```

## Monitoring & Observability

### Prometheus Metrics
Available at `http://localhost:8020/metrics`:
- Agent execution count
- Average response time
- Error rates
- Active coordinations

### Logging
Structured logging with context:
```python
{
  "timestamp": "2025-12-06T10:30:00",
  "level": "INFO",
  "agent": "marketing",
  "task_id": "uuid-here",
  "message": "Task completed successfully"
}
```

### Sentry Integration
Configure `SENTRY_DSN` for error tracking and performance monitoring.

## Performance Optimization

### Caching
- Agent responses cached for 1 hour (configurable)
- Context stored in Redis for fast retrieval
- Vector embeddings cached

### Parallel Execution
Agents can run in parallel for independent tasks:
```python
execution_mode="parallel"  # vs "sequential"
```

### Rate Limiting
- 60 requests per minute per API key
- 1000 requests per hour per API key

## Security

### Best Practices
1. **API Keys:** Never commit API keys to version control
2. **Authentication:** Enable `REQUIRE_API_KEY=true` in production
3. **CORS:** Configure `ALLOWED_ORIGINS` appropriately
4. **Input Validation:** All inputs validated with Pydantic
5. **Rate Limiting:** Enforced to prevent abuse

### Data Privacy
- Agent memory cleared after task completion
- PII handling compliant with GDPR
- Encrypted communication with external services

## Testing

### Run Tests
```bash
pytest
pytest --cov=. --cov-report=html
```

### Test Individual Agent
```bash
pytest tests/test_agents/test_marketing_agent.py
```

### Integration Tests
```bash
pytest tests/integration/
```

## Troubleshooting

### Common Issues

**Issue: Agent timeout**
```
Solution: Increase AGENT_TIMEOUT_SECONDS in .env
```

**Issue: Redis connection failed**
```
Solution: Ensure Redis is running and REDIS_HOST is correct
```

**Issue: OpenAI rate limit**
```
Solution: Implement exponential backoff or upgrade API tier
```

## Development

### Adding a New Agent

1. Create agent class in `agents/`:
```python
from .base_agent import BaseAgent

class MyNewAgent(BaseAgent):
    def __init__(self, shared_memory):
        super().__init__(
            name="MyNewAgent",
            description="Does something amazing",
            shared_memory=shared_memory
        )
        self.capabilities = ["capability1", "capability2"]

    async def execute_task(self, task, context, priority="medium"):
        # Implementation
        pass
```

2. Register in `main.py`:
```python
from agents.my_new_agent import MyNewAgent

my_agent = MyNewAgent(shared_memory)
agents_registry["my_agent"] = my_agent
```

3. Add endpoint:
```python
@app.post("/api/v1/agents/my-agent/action")
async def my_agent_action(request: MyRequest):
    result = await my_agent.execute_task(...)
    return {"success": True, "data": result}
```

### Creating Custom Workflows

Add to `orchestrator/workflows.py`:
```python
async def my_custom_workflow(self, input_data, agents, execution_mode):
    agents = agents or ["agent1", "agent2", "agent3"]

    result = await self.coordinator.coordinate_task(
        task_description="My custom workflow",
        context=input_data,
        required_agents=agents,
        execution_mode=execution_mode
    )

    return {
        "status": "completed",
        "workflow": "my_custom",
        "results": result
    }
```

## Production Deployment

### Kubernetes
See `k8s/` directory for deployment manifests.

### Scaling
- Horizontal: Run multiple instances behind load balancer
- Vertical: Increase resources per pod

### High Availability
- Redis cluster for shared memory
- PostgreSQL replication for persistence
- Multi-region deployment for global reach

## Support & Contributing

### Getting Help
- Documentation: `/docs`
- Issues: GitHub Issues
- Slack: #ai-agents channel

### Contributing
1. Fork the repository
2. Create feature branch
3. Write tests
4. Submit pull request

## License

Proprietary - CitadelBuy Enterprise

## Changelog

### v1.0.0 (2025-12-06)
- Initial release with 12 AI agents
- Multi-agent orchestration
- 6 predefined workflows
- Redis-backed shared memory
- Comprehensive API documentation
