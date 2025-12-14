"""
AI Chatbot Service
Conversational AI for customer support and shopping assistance
"""

from fastapi import FastAPI, HTTPException, WebSocket
from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import datetime
import logging
import json

app = FastAPI(
    title="Broxiva Chatbot Service",
    description="AI-powered conversational assistant",
    version="1.0.0"
)

logger = logging.getLogger(__name__)


class ChatMessage(BaseModel):
    role: str  # user, assistant, system
    content: str
    timestamp: Optional[datetime] = None


class ChatRequest(BaseModel):
    session_id: str
    user_id: Optional[str] = None
    message: str
    context: Optional[Dict] = None
    language: str = "en"


class ChatResponse(BaseModel):
    session_id: str
    response: str
    intent: str
    confidence: float
    suggestions: List[str]
    actions: List[Dict]
    products: Optional[List[Dict]] = None


class IntentRequest(BaseModel):
    text: str
    language: str = "en"


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "chatbot"}


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Process a chat message and generate AI response.
    """
    try:
        from nlp.intent_classifier import IntentClassifier
        from nlp.entity_extractor import EntityExtractor
        from dialogue.dialogue_manager import DialogueManager
        from response.response_generator import ResponseGenerator

        # Classify intent
        intent_classifier = IntentClassifier()
        intent = intent_classifier.classify(request.message, request.language)

        # Extract entities
        entity_extractor = EntityExtractor()
        entities = entity_extractor.extract(request.message, request.language)

        # Manage dialogue state
        dialogue_manager = DialogueManager()
        dialogue_state = dialogue_manager.update(
            session_id=request.session_id,
            intent=intent,
            entities=entities,
            context=request.context
        )

        # Generate response
        response_generator = ResponseGenerator()
        response = response_generator.generate(
            intent=intent,
            entities=entities,
            dialogue_state=dialogue_state,
            language=request.language
        )

        # Get product recommendations if relevant
        products = None
        if intent['name'] in ['product_search', 'recommendation', 'comparison']:
            from integrations.product_service import get_relevant_products
            products = get_relevant_products(entities, limit=5)

        # Generate suggestions for follow-up
        suggestions = response_generator.get_suggestions(dialogue_state)

        return ChatResponse(
            session_id=request.session_id,
            response=response['text'],
            intent=intent['name'],
            confidence=intent['confidence'],
            suggestions=suggestions,
            actions=response.get('actions', []),
            products=products
        )
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/ws/{session_id}")
async def websocket_chat(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time chat.
    """
    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            # Process message
            response = await process_message(session_id, message)

            await websocket.send_json(response)
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
    finally:
        await websocket.close()


async def process_message(session_id: str, message: Dict) -> Dict:
    """Process a single message in WebSocket context."""
    request = ChatRequest(
        session_id=session_id,
        message=message.get('text', ''),
        user_id=message.get('user_id'),
        context=message.get('context'),
        language=message.get('language', 'en')
    )
    response = await chat(request)
    return response.dict()


@app.post("/intent/classify")
async def classify_intent(request: IntentRequest):
    """
    Classify the intent of a text message.
    """
    from nlp.intent_classifier import IntentClassifier

    classifier = IntentClassifier()
    result = classifier.classify(request.text, request.language)

    return {
        "text": request.text,
        "intent": result['name'],
        "confidence": result['confidence'],
        "all_intents": result.get('all_scores', [])
    }


@app.post("/entities/extract")
async def extract_entities(text: str, language: str = "en"):
    """
    Extract named entities from text.
    """
    from nlp.entity_extractor import EntityExtractor

    extractor = EntityExtractor()
    entities = extractor.extract(text, language)

    return {
        "text": text,
        "entities": entities
    }


@app.post("/sentiment/analyze")
async def analyze_sentiment(text: str, language: str = "en"):
    """
    Analyze sentiment of customer message.
    """
    from nlp.sentiment_analyzer import SentimentAnalyzer

    analyzer = SentimentAnalyzer()
    result = analyzer.analyze(text, language)

    return {
        "text": text,
        "sentiment": result['label'],
        "score": result['score'],
        "emotions": result.get('emotions', {})
    }


@app.get("/session/{session_id}/history")
async def get_session_history(session_id: str, limit: int = 50):
    """
    Get chat history for a session.
    """
    from storage.session_store import SessionStore

    store = SessionStore()
    history = store.get_history(session_id, limit)

    return {
        "session_id": session_id,
        "messages": history,
        "count": len(history)
    }


@app.post("/feedback")
async def submit_feedback(
    session_id: str,
    message_id: str,
    rating: int,
    feedback: Optional[str] = None
):
    """
    Submit feedback on a chatbot response.
    """
    from training.feedback_collector import FeedbackCollector

    collector = FeedbackCollector()
    await collector.record(
        session_id=session_id,
        message_id=message_id,
        rating=rating,
        feedback=feedback
    )

    return {"status": "recorded"}


@app.post("/escalate")
async def escalate_to_human(session_id: str, reason: Optional[str] = None):
    """
    Escalate conversation to human support.
    """
    from integrations.support_service import create_support_ticket

    ticket = await create_support_ticket(
        session_id=session_id,
        reason=reason
    )

    return {
        "status": "escalated",
        "ticket_id": ticket['id'],
        "estimated_wait": ticket['estimated_wait']
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
