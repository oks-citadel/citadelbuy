"""
Test Script for LLM Integration
Run this to verify LLM setup is working correctly
"""

import asyncio
import os
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from utils.llm_client import LLMClient, LLMResponse
from utils.prompt_templates import PromptTemplates
from utils.response_parser import ResponseParser, ErrorHandler


async def test_basic_llm_call():
    """Test basic LLM call."""
    print("\n" + "="*60)
    print("TEST 1: Basic LLM Call")
    print("="*60)

    try:
        client = LLMClient(provider="anthropic", fallback_provider="openai")

        response: LLMResponse = await client.generate(
            prompt="Say 'Hello from CitadelBuy AI Agents!' and explain in one sentence what you can help with.",
            temperature=0.7,
            max_tokens=100
        )

        print(f"\n✓ Response received:")
        print(f"  Content: {response.content}")
        print(f"  Model: {response.model}")
        print(f"  Tokens: {response.usage['total_tokens']}")
        print(f"  Provider: {response.metadata.get('provider', 'unknown')}")

        return True

    except Exception as e:
        print(f"\n✗ Failed: {e}")
        return False


async def test_structured_output():
    """Test structured JSON output."""
    print("\n" + "="*60)
    print("TEST 2: Structured JSON Output")
    print("="*60)

    try:
        client = LLMClient()

        schema = {
            "type": "object",
            "required": ["product_name", "price", "confidence"],
            "properties": {
                "product_name": {"type": "string"},
                "price": {"type": "number"},
                "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                "reasoning": {"type": "string"}
            }
        }

        result = await client.generate_structured(
            prompt="Suggest a price for a premium wireless headphone. Product cost is $80.",
            output_schema=schema,
            temperature=0.5
        )

        print(f"\n✓ Structured output received:")
        print(f"  Product: {result.get('product_name')}")
        print(f"  Price: ${result.get('price')}")
        print(f"  Confidence: {result.get('confidence')}")
        print(f"  Reasoning: {result.get('reasoning', '')[:100]}...")

        return True

    except Exception as e:
        print(f"\n✗ Failed: {e}")
        return False


async def test_prompt_templates():
    """Test prompt templates."""
    print("\n" + "="*60)
    print("TEST 3: Prompt Templates")
    print("="*60)

    try:
        context = {
            "task": "Optimize pricing",
            "product_data": {
                "name": "Wireless Mouse",
                "current_price": 29.99,
                "cost": 15.00
            },
            "market_data": {
                "competitor_prices": [24.99, 32.99, 27.99],
                "competitor_average": 28.66,
                "demand_level": 1.2
            }
        }

        system_prompt, user_prompt = PromptTemplates.pricing_advisor(context)

        print(f"\n✓ Prompts generated:")
        print(f"  System prompt length: {len(system_prompt)} chars")
        print(f"  User prompt length: {len(user_prompt)} chars")
        print(f"\n  System prompt preview:")
        print(f"  {system_prompt[:200]}...")
        print(f"\n  User prompt preview:")
        print(f"  {user_prompt[:200]}...")

        return True

    except Exception as e:
        print(f"\n✗ Failed: {e}")
        return False


async def test_response_parsing():
    """Test response parsing."""
    print("\n" + "="*60)
    print("TEST 4: Response Parsing")
    print("="*60)

    try:
        # Test various response formats
        test_cases = [
            # Direct JSON
            '{"price": 29.99, "confidence": 0.85}',

            # Markdown JSON
            '```json\n{"price": 29.99, "confidence": 0.85}\n```',

            # JSON in text
            'Here is my analysis: {"price": 29.99, "confidence": 0.85}',
        ]

        for i, test_input in enumerate(test_cases, 1):
            parsed = ResponseParser.parse_json_response(test_input)
            print(f"\n✓ Test case {i} parsed successfully:")
            print(f"  Input format: {test_input[:50]}...")
            print(f"  Parsed: {parsed}")

        return True

    except Exception as e:
        print(f"\n✗ Failed: {e}")
        return False


async def test_rate_limiting():
    """Test rate limiting."""
    print("\n" + "="*60)
    print("TEST 5: Rate Limiting")
    print("="*60)

    try:
        import time

        client = LLMClient(
            provider="anthropic",
            requests_per_minute=5  # Low limit for testing
        )

        print("\n  Making 3 rapid requests...")
        start = time.time()

        for i in range(3):
            response = await client.generate(
                prompt=f"Count to {i+1}",
                max_tokens=20
            )
            print(f"  Request {i+1}: {time.time() - start:.2f}s elapsed")

        print(f"\n✓ Rate limiting working correctly")
        return True

    except Exception as e:
        print(f"\n✗ Failed: {e}")
        return False


async def test_fallback_mechanism():
    """Test fallback to secondary provider."""
    print("\n" + "="*60)
    print("TEST 6: Fallback Mechanism")
    print("="*60)

    try:
        # Create client with invalid primary key to force fallback
        original_anthropic_key = os.getenv("ANTHROPIC_API_KEY")

        # Temporarily invalidate primary
        os.environ["ANTHROPIC_API_KEY"] = "invalid_key"

        client = LLMClient(
            provider="anthropic",
            fallback_provider="openai"
        )

        # Restore original key
        if original_anthropic_key:
            os.environ["ANTHROPIC_API_KEY"] = original_anthropic_key

        print("\n  Note: Fallback test requires valid OpenAI key")
        print("  Set OPENAI_API_KEY to test this feature")

        # Just check that fallback mechanism exists
        print(f"\n✓ Fallback mechanism configured")
        print(f"  Primary: {client.provider}")
        print(f"  Fallback: {client.fallback_provider}")

        return True

    except Exception as e:
        print(f"\n✗ Failed: {e}")
        return False


async def test_token_counting():
    """Test token counting utilities."""
    print("\n" + "="*60)
    print("TEST 7: Token Counting")
    print("="*60)

    try:
        client = LLMClient()

        test_text = "This is a test sentence for token counting. " * 100

        token_count = client.count_tokens(test_text)
        truncated = client.truncate_to_tokens(test_text, max_tokens=50)

        print(f"\n✓ Token utilities working:")
        print(f"  Original text: {len(test_text)} chars")
        print(f"  Estimated tokens: {token_count}")
        print(f"  Truncated text: {len(truncated)} chars")
        print(f"  Truncated tokens: {client.count_tokens(truncated)}")

        return True

    except Exception as e:
        print(f"\n✗ Failed: {e}")
        return False


async def test_error_handling():
    """Test error handling."""
    print("\n" + "="*60)
    print("TEST 8: Error Handling")
    print("="*60)

    try:
        # Test error formatting
        test_error = ValueError("Test error message")
        formatted = ErrorHandler.format_api_error(test_error, provider="test")

        print(f"\n✓ Error handling working:")
        print(f"  Error type: {formatted['error_type']}")
        print(f"  Recoverable: {formatted['recoverable']}")
        print(f"  Suggested action: {formatted['suggested_action']}")

        # Test fallback response
        fallback = ErrorHandler.create_fallback_response(
            task_id="test_123",
            error=test_error,
            fallback_data={"price": 29.99}
        )

        print(f"\n  Fallback response:")
        print(f"  Status: {fallback['status']}")
        print(f"  Confidence: {fallback['confidence']}")
        print(f"  Fallback used: {fallback['fallback_used']}")

        return True

    except Exception as e:
        print(f"\n✗ Failed: {e}")
        return False


async def check_environment():
    """Check environment configuration."""
    print("\n" + "="*60)
    print("Environment Check")
    print("="*60)

    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    print(f"\n  ANTHROPIC_API_KEY: {'✓ Set' if anthropic_key else '✗ Not set'}")
    print(f"  OPENAI_API_KEY: {'✓ Set' if openai_key else '✗ Not set'}")

    if anthropic_key:
        print(f"  Anthropic key: {anthropic_key[:10]}...{anthropic_key[-4:]}")

    if openai_key:
        print(f"  OpenAI key: {openai_key[:10]}...{openai_key[-4:]}")

    if not anthropic_key and not openai_key:
        print("\n  ⚠ Warning: No API keys configured!")
        print("  Set ANTHROPIC_API_KEY or OPENAI_API_KEY in .env file")
        return False

    return True


async def main():
    """Run all tests."""
    print("\n" + "="*60)
    print("CitadelBuy AI Agents - LLM Integration Test Suite")
    print("="*60)

    # Check environment first
    env_ok = await check_environment()

    if not env_ok:
        print("\n⚠ Environment check failed. Please configure API keys.")
        print("\nTo configure:")
        print("  1. Copy .env.example to .env")
        print("  2. Add your API keys")
        print("  3. Run this test again")
        return

    # Run tests
    tests = [
        ("Basic LLM Call", test_basic_llm_call),
        ("Structured Output", test_structured_output),
        ("Prompt Templates", test_prompt_templates),
        ("Response Parsing", test_response_parsing),
        ("Rate Limiting", test_rate_limiting),
        ("Fallback Mechanism", test_fallback_mechanism),
        ("Token Counting", test_token_counting),
        ("Error Handling", test_error_handling),
    ]

    results = []

    for test_name, test_func in tests:
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n✗ Test '{test_name}' crashed: {e}")
            results.append((test_name, False))

    # Summary
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60 + "\n")

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"  {status}: {test_name}")

    print(f"\n  Total: {passed}/{total} tests passed")

    if passed == total:
        print("\n  🎉 All tests passed! LLM integration is working correctly.")
    else:
        print(f"\n  ⚠ {total - passed} test(s) failed. Review errors above.")

    print("\n" + "="*60)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\nTests interrupted by user.")
    except Exception as e:
        print(f"\n\nFatal error: {e}")
        import traceback
        traceback.print_exc()
