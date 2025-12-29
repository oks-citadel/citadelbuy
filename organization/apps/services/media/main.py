"""
Media Service - FastAPI Application

This service provides media processing capabilities including:
- Image upload and storage
- Image processing and optimization
- Thumbnail generation
- CDN URL generation
- Image analysis for product categorization
"""

import io
import os
import json
import hashlib
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, UploadFile, HTTPException, status, Query, Path as PathParam, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
from pydantic import BaseModel, Field
from PIL import Image, ImageOps, ImageFilter, ImageEnhance
import numpy as np

# Configure structured logging
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FORMAT = os.getenv('LOG_FORMAT', 'json')


class StructuredFormatter(logging.Formatter):
    """Custom formatter for structured JSON logging"""
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "service": "media-service",
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        if hasattr(record, 'extra_data'):
            log_data.update(record.extra_data)
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_data)


# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(getattr(logging, LOG_LEVEL))

if LOG_FORMAT == 'json':
    handler = logging.StreamHandler()
    handler.setFormatter(StructuredFormatter())
    logger.handlers = [handler]
else:
    logging.basicConfig(
        level=LOG_LEVEL,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

# CORS Configuration - Use specific origins instead of wildcard
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', '').split(',') if os.getenv('ALLOWED_ORIGINS') else [
    "http://localhost:3000",
    "http://localhost:8000",
    "http://localhost:8080",
    "https://citadelbuy.com",
    "https://admin.citadelbuy.com",
    "https://api.citadelbuy.com",
]

# CDN Configuration
CDN_BASE_URL = os.getenv('CDN_BASE_URL', 'https://cdn.citadelbuy.com')
STORAGE_PATH = os.getenv('STORAGE_PATH', '/app/data/media')

# In-memory storage for media metadata (replace with database in production)
media_store: Dict[str, Dict] = {}


# ============================================
# Lifespan Manager
# ============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("Media Service starting up...")
    os.makedirs(STORAGE_PATH, exist_ok=True)
    logger.info(f"Storage path: {STORAGE_PATH}")
    logger.info("Media Service initialized successfully")
    yield
    logger.info("Media Service shutting down...")


# Initialize FastAPI app with lifespan
app = FastAPI(
    title="CitadelBuy Media Service",
    description="Media processing, image upload, and CDN URL generation service",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add CORS middleware with specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)


# ============================================
# Enums and Models
# ============================================

class ImageFormat(str, Enum):
    JPEG = "jpeg"
    PNG = "png"
    WEBP = "webp"
    GIF = "gif"


class ImageQuality(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    ORIGINAL = "original"


class ProductCategory(str, Enum):
    ELECTRONICS = "electronics"
    FASHION = "fashion"
    HOME_GARDEN = "home_garden"
    SPORTS = "sports"
    TOYS = "toys"
    BOOKS = "books"
    FOOD = "food"
    AUTOMOTIVE = "automotive"
    BEAUTY = "beauty"
    OTHER = "other"


class ProcessImageResponse(BaseModel):
    success: bool
    original_size: int
    processed_size: int
    compression_ratio: float
    dimensions: Dict[str, int]
    format: str
    processing_time_ms: int


class AnalyzeImageResponse(BaseModel):
    category: ProductCategory
    confidence: float = Field(..., ge=0.0, le=1.0)
    dimensions: Dict[str, int]
    format: str
    file_size: int
    dominant_colors: List[str]
    brightness: float = Field(..., ge=0.0, le=1.0)
    sharpness: float = Field(..., ge=0.0, le=1.0)
    quality_score: float = Field(..., ge=0.0, le=1.0)
    suggestions: List[str]
    metadata: Dict[str, Any]


class HealthResponse(BaseModel):
    status: str
    timestamp: str
    service: str
    version: str


class MediaUpdateRequest(BaseModel):
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    alt_text: Optional[str] = None


class CDNUrlRequest(BaseModel):
    media_id: str
    transformations: Optional[Dict[str, Any]] = None


# ============================================
# Helper Functions
# ============================================

def get_quality_value(quality: ImageQuality) -> int:
    quality_map = {
        ImageQuality.LOW: 60,
        ImageQuality.MEDIUM: 85,
        ImageQuality.HIGH: 95,
        ImageQuality.ORIGINAL: 100
    }
    return quality_map[quality]


def analyze_image_brightness(image: Image.Image) -> float:
    try:
        grayscale = image.convert('L')
        histogram = grayscale.histogram()
        pixels = sum(histogram)
        brightness = sum(i * histogram[i] for i in range(256)) / pixels
        return brightness / 255.0
    except Exception:
        return 0.5


def analyze_image_sharpness(image: Image.Image) -> float:
    try:
        grayscale = image.convert('L')
        array = np.array(grayscale)
        variance = np.var(array)
        sharpness = min(variance / 10000.0, 1.0)
        return sharpness
    except Exception:
        return 0.5


def get_dominant_colors(image: Image.Image, num_colors: int = 3) -> List[str]:
    try:
        small_image = image.copy()
        small_image.thumbnail((100, 100))
        small_image = small_image.convert('RGB')
        pixels = list(small_image.getdata())
        from collections import Counter
        color_counter = Counter(pixels)
        most_common = color_counter.most_common(num_colors)
        hex_colors = [
            "#{:02x}{:02x}{:02x}".format(r, g, b)
            for (r, g, b), _ in most_common
        ]
        return hex_colors
    except Exception:
        return ["#000000", "#808080", "#FFFFFF"]


def categorize_image(image: Image.Image, filename: str) -> tuple:
    width, height = image.size
    aspect_ratio = width / height if height > 0 else 1.0

    if aspect_ratio > 1.5:
        return ProductCategory.FASHION, 0.65
    elif aspect_ratio < 0.7:
        return ProductCategory.BEAUTY, 0.62
    else:
        return ProductCategory.ELECTRONICS, 0.70


def calculate_quality_score(image: Image.Image) -> float:
    brightness = analyze_image_brightness(image)
    sharpness = analyze_image_sharpness(image)
    width, height = image.size
    resolution_score = min((width * height) / (1920 * 1080), 1.0)
    quality_score = brightness * 0.2 + sharpness * 0.4 + resolution_score * 0.4
    return min(max(quality_score, 0.0), 1.0)


def generate_suggestions(analysis_data: Dict[str, Any]) -> List[str]:
    suggestions = []
    brightness = analysis_data.get('brightness', 0.5)
    sharpness = analysis_data.get('sharpness', 0.5)
    quality_score = analysis_data.get('quality_score', 0.5)
    dimensions = analysis_data.get('dimensions', {})

    if brightness < 0.3:
        suggestions.append("Image appears too dark. Consider increasing brightness.")
    elif brightness > 0.8:
        suggestions.append("Image appears overexposed. Consider reducing brightness.")

    if sharpness < 0.4:
        suggestions.append("Image appears blurry. Use a sharper source image.")

    if quality_score < 0.5:
        suggestions.append("Overall image quality is low. Consider using a higher quality source.")

    width = dimensions.get('width', 0)
    height = dimensions.get('height', 0)

    if width < 800 or height < 800:
        suggestions.append("Image resolution is low. Recommend minimum 800x800 pixels for products.")

    if not suggestions:
        suggestions.append("Image quality looks good!")

    return suggestions


# ============================================
# Health Check Endpoint
# ============================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        service="media-service",
        version="1.0.0"
    )


# ============================================
# Upload and CDN Endpoints
# ============================================

@app.post("/api/v1/media/upload", response_model=Dict[str, Any], status_code=201)
async def upload_media(
    file: UploadFile = File(..., description="Image file to upload"),
    tags: Optional[str] = Query(None, description="Comma-separated tags"),
    folder: Optional[str] = Query("general", description="Storage folder"),
    generate_thumbnail: bool = Query(True, description="Generate thumbnail"),
    background_tasks: BackgroundTasks = None
):
    """Upload a new media file."""
    try:
        allowed_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]
        if file.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file.content_type}. Allowed: {allowed_types}"
            )

        contents = await file.read()
        file_size = len(contents)

        if file_size > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size exceeds 10MB limit")

        media_id = str(uuid4())
        file_hash = hashlib.md5(contents).hexdigest()[:8]
        ext = file.filename.split('.')[-1] if '.' in file.filename else 'jpg'
        new_filename = f"{media_id}_{file_hash}.{ext}"

        image = Image.open(io.BytesIO(contents))
        image = ImageOps.exif_transpose(image)

        dimensions = {"width": image.width, "height": image.height}

        folder_path = os.path.join(STORAGE_PATH, folder)
        os.makedirs(folder_path, exist_ok=True)
        file_path = os.path.join(folder_path, new_filename)

        image.save(file_path, quality=95, optimize=True)

        thumbnail_url = None
        if generate_thumbnail:
            thumbnail = image.copy()
            thumbnail.thumbnail((300, 300), Image.Resampling.LANCZOS)
            thumbnail_filename = f"thumb_{new_filename}"
            thumbnail_path = os.path.join(folder_path, thumbnail_filename)

            if thumbnail.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', thumbnail.size, (255, 255, 255))
                if thumbnail.mode == 'P':
                    thumbnail = thumbnail.convert('RGBA')
                background.paste(thumbnail, mask=thumbnail.split()[-1] if thumbnail.mode == 'RGBA' else None)
                thumbnail = background

            thumbnail.save(thumbnail_path, 'JPEG', quality=85, optimize=True)
            thumbnail_url = f"{CDN_BASE_URL}/{folder}/thumb_{new_filename}"

        cdn_url = f"{CDN_BASE_URL}/{folder}/{new_filename}"
        tag_list = [t.strip() for t in tags.split(',')] if tags else []

        media_item = {
            "id": media_id,
            "filename": new_filename,
            "original_filename": file.filename,
            "content_type": file.content_type,
            "size": file_size,
            "dimensions": dimensions,
            "cdn_url": cdn_url,
            "thumbnail_url": thumbnail_url,
            "file_path": file_path,
            "folder": folder,
            "status": "active",
            "tags": tag_list,
            "metadata": {},
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        media_store[media_id] = media_item

        logger.info(f"Media uploaded: {media_id}, filename: {file.filename}, size: {file_size}")

        return {
            "success": True,
            "message": "Media uploaded successfully",
            "data": {
                "id": media_id,
                "filename": new_filename,
                "original_filename": file.filename,
                "content_type": file.content_type,
                "size": file_size,
                "dimensions": dimensions,
                "cdn_url": cdn_url,
                "thumbnail_url": thumbnail_url,
                "created_at": media_item["created_at"]
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading media: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading media: {str(e)}"
        )


@app.get("/api/v1/media", response_model=Dict[str, Any])
async def list_media(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    folder: Optional[str] = None,
    tags: Optional[str] = None,
    status: Optional[str] = Query("active", description="Filter by status")
):
    """List all media items with pagination and filters."""
    items = list(media_store.values())

    if folder:
        items = [i for i in items if i.get("folder") == folder]
    if status:
        items = [i for i in items if i.get("status") == status]
    if tags:
        tag_list = [t.strip() for t in tags.split(',')]
        items = [i for i in items if any(t in i.get("tags", []) for t in tag_list)]

    items.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    paginated_items = items[start:end]

    safe_items = []
    for item in paginated_items:
        safe_item = {k: v for k, v in item.items() if k != "file_path"}
        safe_items.append(safe_item)

    return {
        "success": True,
        "data": safe_items,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size
        }
    }


@app.get("/api/v1/media/{media_id}", response_model=Dict[str, Any])
async def get_media(media_id: str = PathParam(..., description="Media ID")):
    """Get a single media item by ID."""
    if media_id not in media_store:
        raise HTTPException(status_code=404, detail="Media not found")

    item = media_store[media_id]
    safe_item = {k: v for k, v in item.items() if k != "file_path"}

    return {"success": True, "data": safe_item}


@app.put("/api/v1/media/{media_id}", response_model=Dict[str, Any])
async def update_media(
    media_id: str = PathParam(..., description="Media ID"),
    update: MediaUpdateRequest = None
):
    """Update media metadata."""
    if media_id not in media_store:
        raise HTTPException(status_code=404, detail="Media not found")

    item = media_store[media_id]

    if update.tags is not None:
        item["tags"] = update.tags
    if update.metadata is not None:
        item["metadata"].update(update.metadata)
    if update.alt_text is not None:
        item["metadata"]["alt_text"] = update.alt_text

    item["updated_at"] = datetime.utcnow().isoformat()
    logger.info(f"Media updated: {media_id}")

    safe_item = {k: v for k, v in item.items() if k != "file_path"}

    return {"success": True, "message": "Media updated successfully", "data": safe_item}


@app.delete("/api/v1/media/{media_id}", response_model=Dict[str, Any])
async def delete_media(media_id: str = PathParam(..., description="Media ID")):
    """Delete a media item (soft delete)."""
    if media_id not in media_store:
        raise HTTPException(status_code=404, detail="Media not found")

    item = media_store[media_id]
    item["status"] = "deleted"
    item["updated_at"] = datetime.utcnow().isoformat()

    logger.info(f"Media deleted: {media_id}")

    return {"success": True, "message": "Media deleted successfully", "data": {"id": media_id}}


@app.post("/api/v1/media/cdn-url", response_model=Dict[str, Any])
async def generate_cdn_url(request: CDNUrlRequest):
    """Generate a CDN URL with optional transformations."""
    if request.media_id not in media_store:
        raise HTTPException(status_code=404, detail="Media not found")

    item = media_store[request.media_id]
    original_url = item["cdn_url"]

    transformations = request.transformations or {}
    if transformations:
        params = []
        if "width" in transformations:
            params.append(f"w={transformations['width']}")
        if "height" in transformations:
            params.append(f"h={transformations['height']}")
        if "format" in transformations:
            params.append(f"fmt={transformations['format']}")
        if "quality" in transformations:
            params.append(f"q={transformations['quality']}")
        if "fit" in transformations:
            params.append(f"fit={transformations['fit']}")

        transformed_url = f"{original_url}?{'&'.join(params)}" if params else original_url
    else:
        transformed_url = original_url

    return {
        "success": True,
        "data": {
            "media_id": request.media_id,
            "original_url": original_url,
            "transformed_url": transformed_url,
            "transformations": transformations
        }
    }


# ============================================
# Image Processing Endpoints
# ============================================

@app.post("/process-image", response_model=ProcessImageResponse)
async def process_image(
    file: UploadFile = File(..., description="Image file to process"),
    max_width: Optional[int] = None,
    max_height: Optional[int] = None,
    quality: ImageQuality = ImageQuality.MEDIUM,
    format: ImageFormat = ImageFormat.JPEG,
    optimize: bool = True,
    auto_orient: bool = True
):
    """Process and optimize an image."""
    start_time = datetime.now()

    try:
        contents = await file.read()
        original_size = len(contents)

        image = Image.open(io.BytesIO(contents))

        if auto_orient:
            image = ImageOps.exif_transpose(image)

        if max_width or max_height:
            width, height = image.size
            if max_width and max_height:
                image.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
            elif max_width:
                new_height = int(height * (max_width / width))
                image = image.resize((max_width, new_height), Image.Resampling.LANCZOS)
            elif max_height:
                new_width = int(width * (max_height / height))
                image = image.resize((new_width, max_height), Image.Resampling.LANCZOS)

        output_format = format.value.upper()
        if output_format == 'JPEG' and image.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = background

        output_buffer = io.BytesIO()
        save_kwargs = {'format': output_format, 'optimize': optimize}

        if output_format in ('JPEG', 'WEBP'):
            save_kwargs['quality'] = get_quality_value(quality)

        image.save(output_buffer, **save_kwargs)
        processed_size = output_buffer.tell()

        compression_ratio = (1 - processed_size / original_size) * 100 if original_size > 0 else 0
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)

        logger.info(f"Processed image: {file.filename} - Original: {original_size}, Processed: {processed_size}")

        return ProcessImageResponse(
            success=True,
            original_size=original_size,
            processed_size=processed_size,
            compression_ratio=round(compression_ratio, 2),
            dimensions={"width": image.width, "height": image.height},
            format=output_format,
            processing_time_ms=processing_time
        )

    except Exception as e:
        logger.error(f"Error processing image: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing image: {str(e)}"
        )


@app.post("/generate-thumbnail")
async def generate_thumbnail(
    file: UploadFile = File(..., description="Image file"),
    width: int = 150,
    height: int = 150,
    crop: bool = True,
    format: ImageFormat = ImageFormat.JPEG
):
    """Generate a thumbnail from an image."""
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        image = ImageOps.exif_transpose(image)

        if crop:
            image = ImageOps.fit(image, (width, height), Image.Resampling.LANCZOS)
        else:
            image.thumbnail((width, height), Image.Resampling.LANCZOS)

        output_format = format.value.upper()
        if output_format == 'JPEG' and image.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = background

        output_buffer = io.BytesIO()
        save_kwargs = {'format': output_format}

        if output_format in ('JPEG', 'WEBP'):
            save_kwargs['quality'] = 85
            save_kwargs['optimize'] = True

        image.save(output_buffer, **save_kwargs)
        output_buffer.seek(0)

        logger.info(f"Generated thumbnail: {file.filename} - {image.width}x{image.height}")

        return StreamingResponse(
            output_buffer,
            media_type=f"image/{format.value}",
            headers={
                "X-Thumbnail-Width": str(image.width),
                "X-Thumbnail-Height": str(image.height),
                "Content-Disposition": f'inline; filename="thumbnail.{format.value}"'
            }
        )

    except Exception as e:
        logger.error(f"Error generating thumbnail: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating thumbnail: {str(e)}"
        )


@app.post("/analyze-image", response_model=AnalyzeImageResponse)
async def analyze_image(file: UploadFile = File(..., description="Image file to analyze")):
    """Analyze an image for product categorization."""
    try:
        contents = await file.read()
        file_size = len(contents)

        image = Image.open(io.BytesIO(contents))
        image = ImageOps.exif_transpose(image)

        dimensions = {"width": image.width, "height": image.height}
        img_format = image.format or "UNKNOWN"

        category, confidence = categorize_image(image, file.filename)

        brightness = analyze_image_brightness(image)
        sharpness = analyze_image_sharpness(image)
        quality_score = calculate_quality_score(image)
        dominant_colors = get_dominant_colors(image)

        metadata = {}
        try:
            exif_data = image._getexif()
            if exif_data:
                from PIL.ExifTags import TAGS
                metadata = {
                    TAGS.get(tag, tag): str(value)
                    for tag, value in exif_data.items()
                    if tag in TAGS
                }
        except Exception:
            pass

        analysis_data = {
            'brightness': brightness,
            'sharpness': sharpness,
            'quality_score': quality_score,
            'dimensions': dimensions
        }
        suggestions = generate_suggestions(analysis_data)

        logger.info(f"Analyzed image: {file.filename} - Category: {category.value}, Quality: {quality_score:.2f}")

        return AnalyzeImageResponse(
            category=category,
            confidence=round(confidence, 2),
            dimensions=dimensions,
            format=img_format,
            file_size=file_size,
            dominant_colors=dominant_colors,
            brightness=round(brightness, 2),
            sharpness=round(sharpness, 2),
            quality_score=round(quality_score, 2),
            suggestions=suggestions,
            metadata=metadata
        )

    except Exception as e:
        logger.error(f"Error analyzing image: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing image: {str(e)}"
        )


# ============================================
# Root Endpoint
# ============================================

@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "CitadelBuy Media Service",
        "version": "1.0.0",
        "description": "Media processing, image upload, and CDN URL generation service",
        "endpoints": {
            "health": "/health",
            "upload": "/api/v1/media/upload",
            "list": "/api/v1/media",
            "cdn_url": "/api/v1/media/cdn-url",
            "process_image": "/process-image",
            "generate_thumbnail": "/generate-thumbnail",
            "analyze_image": "/analyze-image",
            "docs": "/docs"
        }
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8008"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True, log_level="info")
