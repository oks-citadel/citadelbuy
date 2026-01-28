"""Helper utility functions"""

import uuid
from typing import Any, Dict
import re


def generate_task_id() -> str:
    """Generate a unique task ID."""
    return str(uuid.uuid4())


def format_confidence_score(score: float) -> str:
    """Format confidence score as percentage."""
    return f"{score * 100:.1f}%"


def sanitize_input(text: str) -> str:
    """Sanitize user input to prevent injection."""
    # Remove any potentially harmful characters
    sanitized = re.sub(r'[<>{}]', '', text)
    return sanitized.strip()


def extract_keywords(text: str, max_keywords: int = 10) -> list:
    """Extract keywords from text."""
    # Simple keyword extraction (in production, use NLP library)
    words = re.findall(r'\b\w+\b', text.lower())
    # Filter out common words (simplified)
    common_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'}
    keywords = [w for w in words if w not in common_words and len(w) > 3]

    # Count frequency
    from collections import Counter
    keyword_counts = Counter(keywords)

    return [kw for kw, _ in keyword_counts.most_common(max_keywords)]


def calculate_weighted_score(scores: Dict[str, float], weights: Dict[str, float]) -> float:
    """Calculate weighted score from multiple factors."""
    total_score = 0.0
    total_weight = sum(weights.values())

    for factor, score in scores.items():
        weight = weights.get(factor, 0.0)
        total_score += score * weight

    return total_score / total_weight if total_weight > 0 else 0.0
