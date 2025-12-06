# Migration Guide: Upgrading Agents to Use LLM Integration

## Overview

This guide explains how to upgrade existing AI agents from stub implementations to production-ready LLM integration.

## Quick Start

### Option 1: Use Enhanced Base Agent (Recommended)

The easiest way is to use the new `BaseAgentEnhanced` class:

```python
# Old
from .base_agent import BaseAgent

class MyAgent(BaseAgent):
    # ...

# New
from .base_agent_enhanced import BaseAgent  # or import as BaseAgentEnhanced

class MyAgent(BaseAgent):
    # Same implementation, now has LLM methods available
```

### Option 2: Add LLM to Existing Agent

If you prefer to keep the original base agent, add LLM functionality:

```python
from ..utils.llm_client import LLMClient
from ..utils.prompt_templates import PromptTemplates

class MyAgent(BaseAgent):
    def __init__(self, shared_memory):
        super().__init__(...)
        self._llm_client = LLMClient(
            provider="anthropic",
            fallback_provider="openai"
        )
```

## Step-by-Step Migration

### Step 1: Update Imports

Add these imports to your agent file:

```python
from ..utils.llm_client import LLMClient, LLMResponse
from ..utils.prompt_templates import PromptTemplates
from ..utils.response_parser import ResponseParser, ErrorHandler
```

### Step 2: Update Agent Class

**Before:**
```python
class PricingAdvisorAgent(BaseAgent):
    async def execute_task(self, task, context):
        # Hardcoded business logic
        optimal_price = self._calculate_price(context)
        return {"price": optimal_price}
```

**After:**
```python
class PricingAdvisorAgent(BaseAgent):
    async def execute_task(self, task, context):
        # Get LLM-powered recommendation
        system_prompt, user_prompt = PromptTemplates.pricing_advisor(context)

        try:
            result = await self._call_llm_structured(
                prompt=user_prompt,
                output_schema=schema,
                system_prompt=system_prompt,
                temperature=0.3
            )
            # Enhance with calculations
            return self._enrich_result(result, context)

        except Exception as e:
            # Fallback to original logic
            return self._calculate_price(context)
```

### Step 3: Add Prompt Template

Add a prompt template in `utils/prompt_templates.py`:

```python
@staticmethod
def my_agent(context: Dict[str, Any]) -> str:
    """Prompt template for My Agent."""
    system_prompt = PromptTemplates.get_base_system_prompt() + """

As a [Your Agent Role], you specialize in:
- Capability 1
- Capability 2
- Capability 3

[Specific instructions for your agent]
"""

    task = context.get("task", "")
    data = context.get("data", {})

    user_prompt = f"""Task: {task}

Data:
{json.dumps(data, indent=2)}

Provide:
1. Analysis
2. Recommendations
3. Next steps

Format as JSON."""

    return system_prompt, user_prompt
```

### Step 4: Add Response Schema

Define expected output structure:

```python
schema = {
    "type": "object",
    "required": ["result", "confidence"],
    "properties": {
        "result": {"type": "object"},
        "confidence": {"type": "number", "minimum": 0, "maximum": 1},
        "reasoning": {"type": "string"},
        "recommendations": {"type": "array", "items": {"type": "string"}}
    }
}
```

### Step 5: Implement Fallback Logic

Always provide fallback for when LLM is unavailable:

```python
async def _optimize_with_llm(self, context):
    """LLM-powered optimization."""
    try:
        return await self._call_llm_structured(...)
    except Exception as e:
        logger.warning(f"LLM failed, using fallback: {e}")
        return await self._fallback_optimization(context)

async def _fallback_optimization(self, context):
    """Rule-based fallback."""
    # Original business logic here
    return {"result": "...", "confidence": 0.6}
```

## Complete Example

Here's a complete before/after example:

### Before (Stub Implementation)

```python
class FraudAnalystAgent(BaseAgent):
    async def execute_task(self, task, context):
        transaction = context.get("transaction", {})

        # Simple rule-based fraud detection
        risk_score = 0

        if transaction.get("amount", 0) > 1000:
            risk_score += 30

        if transaction.get("country") != "US":
            risk_score += 20

        action = "approve" if risk_score < 50 else "review"

        return {
            "risk_score": risk_score,
            "action": action,
            "reasoning": "Simple rule-based check"
        }
```

### After (LLM Integration)

```python
from ..utils.llm_client import LLMClient
from ..utils.prompt_templates import PromptTemplates
from ..utils.response_parser import ResponseParser

class FraudAnalystAgent(BaseAgent):
    async def execute_task(self, task, context):
        # Get prompts
        system_prompt, user_prompt = PromptTemplates.fraud_analyst(context)

        # Define schema
        schema = PromptTemplates.get_structured_output_schema("fraud")

        try:
            # Call LLM
            result = await self._call_llm_structured(
                prompt=user_prompt,
                output_schema=schema,
                system_prompt=system_prompt,
                temperature=0.4  # Lower for consistency
            )

            # Validate
            is_valid, errors = ResponseParser.validate_fraud_response(
                {"result": result}
            )

            if not is_valid:
                logger.warning(f"Validation errors: {errors}")

            return {
                "risk_score": result["risk_score"],
                "action": result["action"],
                "reasoning": result.get("reasoning", ""),
                "risk_factors": result.get("risk_factors", []),
                "confidence": result.get("confidence_level", 0.8),
                "llm_powered": True
            }

        except Exception as e:
            logger.error(f"LLM analysis failed: {e}")
            # Fallback to rule-based
            return await self._rule_based_fraud_check(context)

    async def _rule_based_fraud_check(self, context):
        """Fallback rule-based detection."""
        transaction = context.get("transaction", {})

        risk_score = 0
        risk_factors = []

        if transaction.get("amount", 0) > 1000:
            risk_score += 30
            risk_factors.append("High transaction amount")

        if transaction.get("country") != "US":
            risk_score += 20
            risk_factors.append("International transaction")

        action = "approve" if risk_score < 50 else "review"

        return {
            "risk_score": risk_score,
            "action": action,
            "reasoning": "Rule-based fallback check",
            "risk_factors": risk_factors,
            "confidence": 0.6,
            "llm_powered": False
        }
```

## Testing Your Migration

### 1. Unit Test

```python
import pytest
from agents.my_agent import MyAgent
from orchestrator.memory import SharedMemory

@pytest.mark.asyncio
async def test_my_agent_with_llm():
    memory = SharedMemory()
    agent = MyAgent(memory)

    result = await agent.execute_task(
        task="Test task",
        context={"test": "data"}
    )

    assert result["status"] == "completed"
    assert "confidence" in result
    assert "reasoning" in result
```

### 2. Integration Test

```python
@pytest.mark.asyncio
async def test_llm_integration():
    agent = MyAgent(memory)

    # Test with valid context
    result = await agent.execute_task("analyze", valid_context)
    assert result["llm_powered"] == True

    # Test fallback (mock LLM failure)
    with patch.object(agent._llm_client, 'generate', side_effect=Exception):
        result = await agent.execute_task("analyze", valid_context)
        assert result["llm_powered"] == False
        assert result["status"] == "completed"  # Still works!
```

### 3. Manual Test

Run the test script:

```bash
python test_llm_integration.py
```

## Common Issues and Solutions

### Issue: "Module not found: llm_client"

**Solution:** Make sure you're using relative imports:
```python
from ..utils.llm_client import LLMClient  # Note the ..
```

### Issue: "API key not found"

**Solution:** Set environment variables:
```bash
export ANTHROPIC_API_KEY=your-key-here
export OPENAI_API_KEY=your-key-here
```

Or add to `.env` file.

### Issue: "JSON parsing failed"

**Solution:** Use ResponseParser to handle various formats:
```python
parsed = ResponseParser.parse_json_response(response.content)
```

### Issue: "Rate limit exceeded"

**Solution:** Adjust rate limiter:
```python
client = LLMClient(
    requests_per_minute=30,  # Lower limit
    requests_per_hour=500
)
```

### Issue: "Responses are inconsistent"

**Solution:** Lower temperature:
```python
await self._call_llm(
    prompt=prompt,
    temperature=0.2  # More deterministic
)
```

### Issue: "Too expensive"

**Solutions:**
1. Use smaller models
2. Truncate inputs: `client.truncate_to_tokens(text, 1000)`
3. Cache responses
4. Use fallback more aggressively

## Best Practices

### 1. Always Implement Fallback

```python
try:
    return await llm_method()
except Exception:
    return await fallback_method()
```

### 2. Log Everything

```python
logger.info(f"Calling LLM for task: {task}")
logger.info(f"Tokens used: {response.usage['total_tokens']}")
logger.error(f"LLM failed: {e}")
```

### 3. Validate Responses

```python
is_valid, errors = ResponseValidator.validate_pricing_response(result)
if not is_valid:
    logger.warning(f"Invalid response: {errors}")
```

### 4. Set Appropriate Temperature

- 0.0-0.3: Deterministic (pricing, calculations)
- 0.4-0.6: Balanced (analysis)
- 0.7-1.0: Creative (content)

### 5. Use Structured Output

```python
# Instead of parsing free text
result = await self._call_llm_structured(
    prompt=prompt,
    output_schema=schema  # Ensures JSON format
)
```

### 6. Monitor Usage

```python
stats = self._llm_client.get_stats()
logger.info(f"LLM stats: {stats}")
```

## Migration Checklist

- [ ] Add LLM client imports
- [ ] Create prompt template
- [ ] Define response schema
- [ ] Implement LLM call in execute_task
- [ ] Add fallback logic
- [ ] Implement response parsing
- [ ] Add validation
- [ ] Write tests
- [ ] Update documentation
- [ ] Test with real API keys
- [ ] Monitor token usage
- [ ] Optimize prompts

## Rollback Plan

If you need to rollback:

1. Keep old implementation as `_fallback_method()`
2. Use try/except to call LLM first
3. If issues arise, LLM will fail to fallback automatically
4. Can also add feature flag:

```python
USE_LLM = os.getenv("ENABLE_LLM", "true").lower() == "true"

if USE_LLM:
    return await llm_method()
else:
    return await fallback_method()
```

## Performance Considerations

### Response Time

- LLM calls: 1-5 seconds
- Fallback: < 100ms
- Consider async for multiple calls

### Cost

- Claude Sonnet: ~$3 per million input tokens
- GPT-4 Turbo: ~$10 per million input tokens
- Monitor with `get_stats()`

### Accuracy

- LLM: Higher quality, context-aware
- Fallback: Consistent, rule-based
- Hybrid approach recommended

## Next Steps

1. Migrate one agent as a pilot
2. Test thoroughly
3. Monitor performance and costs
4. Iterate on prompts
5. Migrate remaining agents
6. Optimize based on usage patterns

## Support

- See `LLM_IMPLEMENTATION.md` for detailed API docs
- Check `test_llm_integration.py` for examples
- Review `pricing_advisor_enhanced.py` for complete implementation
- Ask team for help with prompt engineering
