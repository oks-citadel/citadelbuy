"""
AI-Powered Search Service
Semantic search, visual search, and voice search capabilities
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional, Dict
import logging

app = FastAPI(
    title="CitadelBuy Search Service",
    description="AI-powered search with semantic, visual, and voice capabilities",
    version="1.0.0"
)

logger = logging.getLogger(__name__)


class SearchRequest(BaseModel):
    query: str
    user_id: Optional[str] = None
    category: Optional[str] = None
    filters: Optional[Dict] = None
    page: int = 1
    page_size: int = 20
    search_type: str = "semantic"  # keyword, semantic, hybrid


class SearchResult(BaseModel):
    product_id: str
    name: str
    description: str
    price: float
    score: float
    highlights: List[str]
    category: str
    image_url: Optional[str] = None


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    total: int
    page: int
    suggestions: List[str]
    facets: Dict


class VisualSearchRequest(BaseModel):
    user_id: Optional[str] = None
    category: Optional[str] = None
    limit: int = 20


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "search"}


@app.post("/search", response_model=SearchResponse)
async def search_products(request: SearchRequest):
    """
    Search products using AI-powered semantic search.

    Search Types:
    - keyword: Traditional keyword matching
    - semantic: AI-powered semantic understanding
    - hybrid: Combination of keyword and semantic
    """
    try:
        from indexing.elasticsearch_client import ElasticsearchClient
        from query.semantic_search import SemanticSearch
        from query.query_processor import QueryProcessor

        # Process and understand the query
        processor = QueryProcessor()
        processed_query = processor.process(request.query)

        if request.search_type == "semantic":
            search_engine = SemanticSearch()
        else:
            search_engine = ElasticsearchClient()

        results = search_engine.search(
            query=processed_query,
            filters=request.filters,
            category=request.category,
            page=request.page,
            page_size=request.page_size
        )

        # Generate search suggestions
        suggestions = processor.get_suggestions(request.query)

        # Get facets for filtering
        facets = search_engine.get_facets(processed_query)

        return SearchResponse(
            query=request.query,
            results=results['items'],
            total=results['total'],
            page=request.page,
            suggestions=suggestions,
            facets=facets
        )
    except Exception as e:
        logger.error(f"Search error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/visual-search")
async def visual_search(
    image: UploadFile = File(...),
    user_id: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = 20
):
    """
    Search products using an uploaded image.
    Uses computer vision to find visually similar products.
    """
    try:
        from visual.image_search import ImageSearchEngine
        from visual.feature_extractor import FeatureExtractor

        # Read image content
        image_content = await image.read()

        # Extract visual features
        extractor = FeatureExtractor()
        features = extractor.extract(image_content)

        # Search for similar products
        search_engine = ImageSearchEngine()
        results = search_engine.search_by_features(
            features=features,
            category=category,
            limit=limit
        )

        return {
            "results": results,
            "total": len(results),
            "search_type": "visual"
        }
    except Exception as e:
        logger.error(f"Visual search error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/voice-search")
async def voice_search(
    audio: UploadFile = File(...),
    user_id: Optional[str] = None,
    language: str = "en"
):
    """
    Search products using voice input.
    Transcribes audio and performs semantic search.
    """
    try:
        from voice.speech_to_text import SpeechToText
        from query.semantic_search import SemanticSearch

        # Read audio content
        audio_content = await audio.read()

        # Transcribe audio to text
        stt = SpeechToText()
        transcription = stt.transcribe(audio_content, language=language)

        # Perform semantic search with transcribed query
        search_engine = SemanticSearch()
        results = search_engine.search(
            query=transcription['text'],
            page=1,
            page_size=20
        )

        return {
            "transcription": transcription,
            "results": results['items'],
            "total": results['total'],
            "search_type": "voice"
        }
    except Exception as e:
        logger.error(f"Voice search error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/autocomplete")
async def autocomplete(query: str, limit: int = 10):
    """Get search autocomplete suggestions."""
    from query.autocomplete import AutocompleteEngine

    engine = AutocompleteEngine()
    suggestions = engine.suggest(query, limit)
    return {"query": query, "suggestions": suggestions}


@app.post("/spell-correct")
async def spell_correct(query: str):
    """Get spelling correction suggestions."""
    from query.spell_checker import SpellChecker

    checker = SpellChecker()
    correction = checker.correct(query)
    return {"original": query, "corrected": correction}


@app.post("/index/product")
async def index_product(product: Dict):
    """Index a single product for search."""
    from indexing.product_indexer import ProductIndexer

    indexer = ProductIndexer()
    await indexer.index_product(product)
    return {"status": "indexed", "product_id": product.get('id')}


@app.post("/index/bulk")
async def bulk_index(products: List[Dict]):
    """Bulk index multiple products."""
    from indexing.product_indexer import ProductIndexer

    indexer = ProductIndexer()
    result = await indexer.bulk_index(products)
    return {"status": "completed", "indexed": result['indexed'], "errors": result['errors']}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
