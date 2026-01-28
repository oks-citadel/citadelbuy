"""
Response Parser and Error Handling Utilities
"""

from typing import Dict, Any, List, Optional
import json
import re
import logging

logger = logging.getLogger(__name__)


class ResponseParser:
    """Parse and validate LLM responses."""

    @staticmethod
    def parse_json_response(
        content: str,
        expected_keys: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Parse JSON from LLM response.

        Args:
            content: Response content
            expected_keys: Optional list of required keys

        Returns:
            Parsed JSON dict

        Raises:
            ValueError: If parsing fails
        """
        try:
            # Try direct JSON parse
            parsed = json.loads(content)

        except json.JSONDecodeError:
            # Try to extract JSON from markdown code blocks
            parsed = ResponseParser._extract_json_from_markdown(content)

            if parsed is None:
                # Try to extract JSON from text
                parsed = ResponseParser._extract_json_from_text(content)

            if parsed is None:
                raise ValueError(f"Failed to parse JSON from response: {content[:200]}...")

        # Validate expected keys
        if expected_keys:
            missing_keys = [k for k in expected_keys if k not in parsed]
            if missing_keys:
                logger.warning(f"Missing expected keys in response: {missing_keys}")

        return parsed

    @staticmethod
    def _extract_json_from_markdown(content: str) -> Optional[Dict[str, Any]]:
        """Extract JSON from markdown code blocks."""
        # Match ```json ... ``` or ``` ... ```
        patterns = [
            r'```json\s*(.*?)\s*```',
            r'```\s*(.*?)\s*```'
        ]

        for pattern in patterns:
            match = re.search(pattern, content, re.DOTALL)
            if match:
                try:
                    return json.loads(match.group(1))
                except json.JSONDecodeError:
                    continue

        return None

    @staticmethod
    def _extract_json_from_text(content: str) -> Optional[Dict[str, Any]]:
        """Try to find JSON object in text."""
        # Look for {...} pattern
        brace_start = content.find('{')
        brace_end = content.rfind('}')

        if brace_start != -1 and brace_end != -1 and brace_end > brace_start:
            try:
                json_str = content[brace_start:brace_end + 1]
                return json.loads(json_str)
            except json.JSONDecodeError:
                pass

        return None

    @staticmethod
    def validate_schema(
        data: Dict[str, Any],
        schema: Dict[str, Any]
    ) -> tuple[bool, List[str]]:
        """
        Validate data against a JSON schema.

        Args:
            data: Data to validate
            schema: JSON schema

        Returns:
            Tuple of (is_valid, list of errors)
        """
        errors = []

        # Check required fields
        required = schema.get("required", [])
        for field in required:
            if field not in data:
                errors.append(f"Missing required field: {field}")

        # Check properties
        properties = schema.get("properties", {})
        for field, field_schema in properties.items():
            if field in data:
                field_errors = ResponseParser._validate_field(
                    data[field],
                    field_schema,
                    field
                )
                errors.extend(field_errors)

        return len(errors) == 0, errors

    @staticmethod
    def _validate_field(
        value: Any,
        schema: Dict[str, Any],
        field_name: str
    ) -> List[str]:
        """Validate a single field."""
        errors = []

        # Check type
        expected_type = schema.get("type")
        if expected_type:
            if not ResponseParser._check_type(value, expected_type):
                errors.append(
                    f"Field '{field_name}' has incorrect type. "
                    f"Expected {expected_type}, got {type(value).__name__}"
                )

        # Check minimum/maximum for numbers
        if isinstance(value, (int, float)):
            minimum = schema.get("minimum")
            maximum = schema.get("maximum")

            if minimum is not None and value < minimum:
                errors.append(f"Field '{field_name}' is below minimum: {minimum}")

            if maximum is not None and value > maximum:
                errors.append(f"Field '{field_name}' is above maximum: {maximum}")

        # Check enum values
        enum_values = schema.get("enum")
        if enum_values and value not in enum_values:
            errors.append(
                f"Field '{field_name}' must be one of {enum_values}, got '{value}'"
            )

        # Check array items
        if expected_type == "array" and isinstance(value, list):
            items_schema = schema.get("items")
            if items_schema:
                for i, item in enumerate(value):
                    item_errors = ResponseParser._validate_field(
                        item,
                        items_schema,
                        f"{field_name}[{i}]"
                    )
                    errors.extend(item_errors)

        return errors

    @staticmethod
    def _check_type(value: Any, expected_type: str) -> bool:
        """Check if value matches expected JSON type."""
        type_map = {
            "string": str,
            "number": (int, float),
            "integer": int,
            "boolean": bool,
            "array": list,
            "object": dict,
            "null": type(None)
        }

        expected_python_type = type_map.get(expected_type)
        if expected_python_type is None:
            return True  # Unknown type, skip validation

        return isinstance(value, expected_python_type)

    @staticmethod
    def extract_recommendations(parsed_response: Dict[str, Any]) -> List[str]:
        """Extract recommendations from parsed response."""
        # Try different common keys
        for key in ["recommendations", "recommendation", "suggested_actions", "actions"]:
            if key in parsed_response:
                value = parsed_response[key]
                if isinstance(value, list):
                    return value
                elif isinstance(value, str):
                    return [value]

        return []

    @staticmethod
    def extract_confidence(parsed_response: Dict[str, Any]) -> float:
        """Extract confidence score from parsed response."""
        for key in ["confidence_score", "confidence", "certainty"]:
            if key in parsed_response:
                try:
                    conf = float(parsed_response[key])
                    return max(0.0, min(1.0, conf))  # Clamp to [0, 1]
                except (ValueError, TypeError):
                    continue

        return 0.5  # Default confidence

    @staticmethod
    def extract_reasoning(parsed_response: Dict[str, Any]) -> str:
        """Extract reasoning from parsed response."""
        for key in ["reasoning", "explanation", "rationale", "analysis"]:
            if key in parsed_response:
                value = parsed_response[key]
                if isinstance(value, str):
                    return value

        return ""

    @staticmethod
    def standardize_response(
        parsed_response: Dict[str, Any],
        task_id: str = "",
        status: str = "completed"
    ) -> Dict[str, Any]:
        """
        Standardize response format across all agents.

        Args:
            parsed_response: Parsed LLM response
            task_id: Task identifier
            status: Task status

        Returns:
            Standardized response dict
        """
        return {
            "task_id": task_id,
            "status": status,
            "result": parsed_response.get("result", parsed_response),
            "confidence": ResponseParser.extract_confidence(parsed_response),
            "reasoning": ResponseParser.extract_reasoning(parsed_response),
            "recommendations": ResponseParser.extract_recommendations(parsed_response),
            "next_actions": parsed_response.get("next_actions", []),
            "metadata": {
                "raw_keys": list(parsed_response.keys())
            }
        }


class ErrorHandler:
    """Handle and format errors from LLM calls."""

    @staticmethod
    def format_api_error(error: Exception, provider: str = "unknown") -> Dict[str, Any]:
        """Format API error for logging and response."""
        error_type = type(error).__name__

        return {
            "error_type": error_type,
            "error_message": str(error),
            "provider": provider,
            "recoverable": ErrorHandler._is_recoverable_error(error),
            "suggested_action": ErrorHandler._get_suggested_action(error)
        }

    @staticmethod
    def _is_recoverable_error(error: Exception) -> bool:
        """Determine if error is recoverable with retry."""
        recoverable_errors = [
            "RateLimitError",
            "APIConnectionError",
            "Timeout",
            "ServiceUnavailable"
        ]

        error_type = type(error).__name__
        return any(err in error_type for err in recoverable_errors)

    @staticmethod
    def _get_suggested_action(error: Exception) -> str:
        """Get suggested action based on error type."""
        error_type = type(error).__name__

        actions = {
            "RateLimitError": "Wait and retry. Consider reducing request rate.",
            "APIConnectionError": "Check network connection and API status.",
            "AuthenticationError": "Verify API key is correct and valid.",
            "InvalidRequestError": "Check request parameters and format.",
            "Timeout": "Retry with longer timeout or smaller request.",
        }

        for key, action in actions.items():
            if key in error_type:
                return action

        return "Review error details and retry."

    @staticmethod
    def create_fallback_response(
        task_id: str,
        error: Exception,
        fallback_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Create fallback response when LLM fails."""
        return {
            "task_id": task_id,
            "status": "completed_with_fallback",
            "result": fallback_data or {},
            "confidence": 0.3,
            "reasoning": f"LLM unavailable, using fallback logic. Error: {str(error)}",
            "recommendations": ["Verify LLM service availability", "Review fallback logic"],
            "next_actions": ["Retry with LLM when available"],
            "error_info": ErrorHandler.format_api_error(error),
            "fallback_used": True
        }


class ResponseValidator:
    """Validate agent responses meet quality standards."""

    @staticmethod
    def validate_pricing_response(response: Dict[str, Any]) -> tuple[bool, List[str]]:
        """Validate pricing agent response."""
        errors = []

        # Check required fields
        result = response.get("result", {})

        required_fields = ["recommended_price", "confidence"]
        for field in required_fields:
            if field not in result and field not in response:
                errors.append(f"Missing required field: {field}")

        # Validate price is positive
        price = result.get("recommended_price", response.get("recommended_price"))
        if price is not None:
            try:
                price_float = float(price)
                if price_float <= 0:
                    errors.append("Recommended price must be positive")
            except (ValueError, TypeError):
                errors.append("Recommended price must be a number")

        # Validate confidence is in range
        confidence = response.get("confidence", 0)
        if not (0 <= confidence <= 1):
            errors.append(f"Confidence must be between 0 and 1, got {confidence}")

        return len(errors) == 0, errors

    @staticmethod
    def validate_fraud_response(response: Dict[str, Any]) -> tuple[bool, List[str]]:
        """Validate fraud analysis response."""
        errors = []

        result = response.get("result", {})

        # Check risk score
        risk_score = result.get("risk_score", response.get("risk_score"))
        if risk_score is None:
            errors.append("Missing risk_score")
        elif not (0 <= risk_score <= 100):
            errors.append(f"Risk score must be 0-100, got {risk_score}")

        # Check action
        action = result.get("action", response.get("action"))
        valid_actions = ["approve", "review", "block"]
        if action and action not in valid_actions:
            errors.append(f"Action must be one of {valid_actions}, got '{action}'")

        return len(errors) == 0, errors
