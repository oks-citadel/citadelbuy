# LLM Implementation for AI Agents Service

## Overview

This document describes the implementation of actual LLM API calls for the AI Agents service, replacing the previous stub implementations with production-ready Claude (Anthropic) and OpenAI integrations.

## Architecture

### Core Components

1. **Enhanced LLM Client** (`utils/llm_client.py`)
   - Supports both Anthropic Claude and OpenAI GPT models
   - Automatic fallback between providers
   - Built-in rate limiting and retry logic
   - Token counting and truncation utilities
   - Usage statistics tracking

2. **Prompt Templates** (`utils/prompt_templates.py`)
   - Centralized prompt management for all agent types
   - System and user prompt generation
   - JSON schema definitions for structured outputs
   - Agent-specific prompt engineering

3. **Enhanced Base Agent** (`agents/base_agent_enhanced.py`)
   - Integrated LLM calling methods
   - Response parsing and validation
   - Error handling with automatic retries
   - Standardized response formatting

4. **Response Parser** (`utils/response_parser.py`)
   - JSON extraction from various formats
   - Schema validation
   - Error handling utilities
   - Response standardization

## Features

### 1. Dual Provider Support

The system supports both Anthropic Claude (primary) and OpenAI (fallback):

```python
client = LLMClient(
    provider="anthropic",           # Primary provider
    fallback_provider="openai"      # Automatic fallback
)
```

### 2. Rate Limiting

Token bucket algorithm prevents API rate limit violations:

```python
rate_limiter = RateLimiter(
    requests_per_minute=60,
    requests_per_hour=1000
)
```

### 3. Retry Logic

Automatic exponential backoff for transient failures:

```python
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    retry=retry_if_exception_type((RateLimitError, APIConnectionError))
)
```

### 4. Structured Output

Generate JSON conforming to predefined schemas:

```python
result = await client.generate_structured(
    prompt=user_prompt,
    output_schema=schema,
    system_prompt=system_prompt
)
```

### 5. Response Parsing

Robust parsing handles various response formats:

- Direct JSON
- Markdown code blocks (```json ... ```)
- JSON embedded in text
- Validation against expected schema

## Usage Examples

### Basic LLM Call

```python
from utils.llm_client import LLMClient

client = LLMClient()
response = await client.generate(
    prompt="Analyze this pricing data...",
    temperature=0.7,
    max_tokens=2000,
    system_prompt="You are a pricing expert..."
)

print(response.content)
print(response.usage)  # Token usage stats
```

### Using in an Agent

```python
class MyAgent(BaseAgent):
    async def execute_task(self, task, context):
        # Get prompts
        system_prompt, user_prompt = PromptTemplates.my_agent(context)

        # Call LLM
        result = await self._call_llm_structured(
            prompt=user_prompt,
            output_schema=schema,
            system_prompt=system_prompt,
            temperature=0.5
        )

        return result
```

### Batch Processing

```python
prompts = ["Analyze product A", "Analyze product B", "Analyze product C"]
responses = await client.batch_generate(prompts)
```

## Environment Configuration

Required environment variables:

```bash
# Anthropic (Primary)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# OpenAI (Fallback)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview

# Rate Limits
RATE_LIMIT_PER_MINUTE=60
RATE_LIMIT_PER_HOUR=1000
```

## Prompt Templates

Each agent type has specialized prompts:

### Pricing Advisor
- Focuses on margin optimization and competitive analysis
- Temperature: 0.3 (deterministic pricing)
- Includes market data and cost analysis

### Fraud Analyst
- Risk assessment and anomaly detection
- Temperature: 0.4 (balanced)
- Structured output with risk scores

### Content Writer
- SEO-optimized product descriptions
- Temperature: 0.7 (creative)
- Brand voice consistency

### Marketing Manager
- Campaign strategy and ROI analysis
- Temperature: 0.6 (balanced creativity)
- Audience segmentation

### Sales Director
- Pipeline analysis and forecasting
- Temperature: 0.4 (analytical)
- Performance metrics focus

## Response Format

All agent responses follow this standardized format:

```json
{
  "task_id": "uuid",
  "status": "completed",
  "result": {
    // Agent-specific results
  },
  "confidence": 0.85,
  "reasoning": "Detailed explanation...",
  "recommendations": [
    "Action item 1",
    "Action item 2"
  ],
  "next_actions": [
    "Step 1",
    "Step 2"
  ],
  "llm_metadata": {
    "model_used": "claude-3-5-sonnet",
    "provider": "anthropic",
    "tokens_used": 1500
  }
}
```

## Error Handling

### Automatic Fallback

If Anthropic fails, automatically tries OpenAI:

```python
try:
    # Try Anthropic
    response = await generate_anthropic(...)
except Exception:
    # Fallback to OpenAI
    response = await generate_openai(...)
```

### Graceful Degradation

If both LLM providers fail, agents fall back to rule-based logic:

```python
try:
    return await self._optimize_price_with_llm(context)
except Exception:
    return await self._fallback_price_optimization(context)
```

## Usage Statistics

Track LLM usage across agents:

```python
stats = client.get_stats()
# {
#   "total_requests": 150,
#   "successful_requests": 145,
#   "failed_requests": 5,
#   "anthropic_requests": 140,
#   "openai_requests": 10,
#   "total_tokens": 45000,
#   "fallback_used": 10,
#   "success_rate": 0.967,
#   "fallback_rate": 0.067
# }
```

## Token Management

### Token Counting

Accurate token counting using tiktoken:

```python
tokens = client.count_tokens(text, model="gpt-4")
```

### Token Truncation

Automatically truncate to fit limits:

```python
truncated = client.truncate_to_tokens(text, max_tokens=1000)
```

## Best Practices

### 1. Temperature Selection

- **0.0-0.3**: Deterministic outputs (pricing, calculations)
- **0.4-0.6**: Balanced (analysis, recommendations)
- **0.7-1.0**: Creative (content writing, marketing)

### 2. Prompt Engineering

- Be specific and clear in instructions
- Provide context and examples
- Request structured output when needed
- Include output format in prompt

### 3. Error Handling

- Always implement fallback logic
- Log errors for debugging
- Return user-friendly error messages
- Track failure rates

### 4. Rate Limiting

- Stay within provider limits
- Use batch processing for multiple items
- Implement backoff strategies
- Monitor usage statistics

### 5. Cost Optimization

- Use appropriate models (not always the largest)
- Truncate long inputs
- Cache common responses
- Monitor token usage

## Implementation Examples

### Enhanced Pricing Advisor

See `agents/pricing_advisor_enhanced.py` for a complete example showing:

- LLM-powered price optimization
- Competitive analysis
- Margin optimization
- Fallback to rule-based pricing
- Response enrichment with calculations

### Migration Path

To migrate existing agents:

1. Inherit from `BaseAgentEnhanced` instead of `BaseAgent`
2. Use `PromptTemplates` for prompts
3. Call `_call_llm()` or `_call_llm_structured()`
4. Parse responses with `ResponseParser`
5. Implement fallback logic
6. Add error handling

Example:

```python
# Old implementation
async def execute_task(self, task, context):
    # Hardcoded logic
    result = self._calculate_something(context)
    return result

# New implementation
async def execute_task(self, task, context):
    system_prompt, user_prompt = PromptTemplates.my_agent(context)

    try:
        # Try LLM first
        llm_result = await self._call_llm_structured(
            prompt=user_prompt,
            output_schema=schema,
            system_prompt=system_prompt
        )
        return llm_result
    except Exception as e:
        # Fallback to original logic
        logger.warning(f"LLM failed, using fallback: {e}")
        result = self._calculate_something(context)
        return result
```

## Testing

### Unit Tests

```python
import pytest
from utils.llm_client import LLMClient

@pytest.mark.asyncio
async def test_llm_client():
    client = LLMClient()
    response = await client.generate(
        prompt="Test prompt",
        max_tokens=100
    )
    assert response.content
    assert response.usage["total_tokens"] > 0
```

### Integration Tests

```python
@pytest.mark.asyncio
async def test_pricing_agent():
    agent = PricingAdvisorEnhanced(shared_memory)
    result = await agent.optimize_price(
        product_id="P123",
        current_price=100.0,
        cost=60.0,
        market_data={"competitor_average": 95.0}
    )
    assert result["status"] == "completed"
    assert "recommended_price" in result["result"]
```

## Monitoring

### Key Metrics

- Request success rate
- Average response time
- Token usage per agent
- Fallback usage rate
- Error types and frequency

### Logging

All LLM interactions are logged:

```python
logger.info(f"LLM call started: {agent_name}")
logger.info(f"Tokens used: {response.usage['total_tokens']}")
logger.error(f"LLM call failed: {error}")
```

## Troubleshooting

### Common Issues

**Issue**: Rate limit errors
- **Solution**: Reduce requests_per_minute in RateLimiter

**Issue**: Parsing failures
- **Solution**: Check prompt asks for JSON, validate schema

**Issue**: High costs
- **Solution**: Use smaller models, truncate inputs, cache responses

**Issue**: Slow responses
- **Solution**: Reduce max_tokens, use batch processing

**Issue**: Inconsistent outputs
- **Solution**: Lower temperature, improve prompts, add examples

## Future Enhancements

- [ ] Response caching for common queries
- [ ] Fine-tuned models for specific agents
- [ ] Streaming responses for long outputs
- [ ] Multi-turn conversations with context
- [ ] A/B testing different prompts
- [ ] Cost tracking and budgeting
- [ ] Model performance comparison

## Security Considerations

- API keys stored in environment variables
- No sensitive data in logs
- Input sanitization
- Output validation
- Rate limiting prevents abuse
- Audit trail of all LLM calls

## Documentation

- API Reference: See docstrings in each module
- Examples: See `pricing_advisor_enhanced.py`
- Prompt Library: See `prompt_templates.py`
- Error Codes: See `response_parser.py`

## Support

For issues or questions:
1. Check logs for error details
2. Review usage statistics
3. Verify API keys are valid
4. Test with simple prompts first
5. Check provider status pages
