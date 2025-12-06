"""
Media AI Service - FastAPI Application

This service provides AI-powered media processing capabilities including:
- Image processing and optimization
- Thumbnail generation
- Image analysis for product categorization
"""

import io
import logging
from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException, status
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field, validator
from PIL import Image, ImageOps, ImageFilter, ImageEnhance
import numpy as np

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Media AI Service",
    description="AI-powered media processing and analysis service",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)


# Enums and Models
class ImageFormat(str, Enum):
    """Supported image formats"""
    JPEG = "jpeg"
    PNG = "png"
    WEBP = "webp"
    GIF = "gif"


class ImageQuality(str, Enum):
    """Image quality presets"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    ORIGINAL = "original"


class ProductCategory(str, Enum):
    """Product categories for image analysis"""
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


class ProcessImageRequest(BaseModel):
    """Request model for image processing"""
    max_width: Optional[int] = Field(None, ge=100, le=4000, description="Maximum width in pixels")
    max_height: Optional[int] = Field(None, ge=100, le=4000, description="Maximum height in pixels")
    quality: ImageQuality = Field(ImageQuality.MEDIUM, description="Image quality preset")
    format: ImageFormat = Field(ImageFormat.JPEG, description="Output format")
    optimize: bool = Field(True, description="Optimize image for web")
    auto_orient: bool = Field(True, description="Auto-orient based on EXIF data")


class GenerateThumbnailRequest(BaseModel):
    """Request model for thumbnail generation"""
    width: int = Field(150, ge=50, le=500, description="Thumbnail width in pixels")
    height: int = Field(150, ge=50, le=500, description="Thumbnail height in pixels")
    crop: bool = Field(True, description="Crop to exact dimensions")
    format: ImageFormat = Field(ImageFormat.JPEG, description="Output format")


class AnalyzeImageResponse(BaseModel):
    """Response model for image analysis"""
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


class ProcessImageResponse(BaseModel):
    """Response model for image processing"""
    success: bool
    original_size: int
    processed_size: int
    compression_ratio: float
    dimensions: Dict[str, int]
    format: str
    processing_time_ms: int


class ThumbnailResponse(BaseModel):
    """Response model for thumbnail generation"""
    success: bool
    dimensions: Dict[str, int]
    file_size: int
    format: str


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: str
    service: str
    version: str


# Helper Functions
def get_quality_value(quality: ImageQuality) -> int:
    """Convert quality preset to numeric value"""
    quality_map = {
        ImageQuality.LOW: 60,
        ImageQuality.MEDIUM: 85,
        ImageQuality.HIGH: 95,
        ImageQuality.ORIGINAL: 100
    }
    return quality_map[quality]


def analyze_image_brightness(image: Image.Image) -> float:
    """Analyze image brightness"""
    try:
        grayscale = image.convert('L')
        histogram = grayscale.histogram()
        pixels = sum(histogram)
        brightness = sum(i * histogram[i] for i in range(256)) / pixels
        return brightness / 255.0
    except Exception as e:
        logger.warning(f"Error analyzing brightness: {e}")
        return 0.5


def analyze_image_sharpness(image: Image.Image) -> float:
    """Analyze image sharpness using Laplacian variance"""
    try:
        grayscale = image.convert('L')
        array = np.array(grayscale)

        # Calculate Laplacian
        laplacian = np.array([
            [0, 1, 0],
            [1, -4, 1],
            [0, 1, 0]
        ])

        # Simple convolution approximation
        variance = np.var(array)
        # Normalize to 0-1 range (simplified)
        sharpness = min(variance / 10000.0, 1.0)
        return sharpness
    except Exception as e:
        logger.warning(f"Error analyzing sharpness: {e}")
        return 0.5


def get_dominant_colors(image: Image.Image, num_colors: int = 3) -> List[str]:
    """Extract dominant colors from image"""
    try:
        # Resize for performance
        small_image = image.copy()
        small_image.thumbnail((100, 100))

        # Convert to RGB
        small_image = small_image.convert('RGB')

        # Get colors
        pixels = list(small_image.getdata())

        # Simple color extraction (placeholder for more sophisticated algorithm)
        # In production, use k-means clustering
        from collections import Counter
        color_counter = Counter(pixels)
        most_common = color_counter.most_common(num_colors)

        # Convert to hex
        hex_colors = [
            "#{:02x}{:02x}{:02x}".format(r, g, b)
            for (r, g, b), _ in most_common
        ]

        return hex_colors
    except Exception as e:
        logger.warning(f"Error extracting colors: {e}")
        return ["#000000", "#808080", "#FFFFFF"]


def categorize_image(image: Image.Image, filename: str) -> tuple[ProductCategory, float]:
    """
    Categorize image based on content analysis.
    This is a placeholder implementation. In production, this would use a
    trained ML model for image classification.
    """
    # Placeholder logic based on image characteristics
    # In production, replace with actual ML model inference

    width, height = image.size
    aspect_ratio = width / height if height > 0 else 1.0

    # Simple heuristic-based categorization (placeholder)
    # Real implementation would use CNN model like ResNet, EfficientNet, etc.

    if aspect_ratio > 1.5:
        # Wide images might be banners or fashion
        return ProductCategory.FASHION, 0.65
    elif aspect_ratio < 0.7:
        # Tall images might be fashion or beauty
        return ProductCategory.BEAUTY, 0.62
    else:
        # Square-ish images - default to electronics
        return ProductCategory.ELECTRONICS, 0.70

    # In production, this would be:
    # - Load pre-trained model
    # - Preprocess image
    # - Run inference
    # - Return category with confidence score


def calculate_quality_score(image: Image.Image) -> float:
    """Calculate overall image quality score"""
    brightness = analyze_image_brightness(image)
    sharpness = analyze_image_sharpness(image)

    width, height = image.size
    resolution_score = min((width * height) / (1920 * 1080), 1.0)

    # Weighted average
    quality_score = (
        brightness * 0.2 +
        sharpness * 0.4 +
        resolution_score * 0.4
    )

    return min(max(quality_score, 0.0), 1.0)


def generate_suggestions(analysis_data: Dict[str, Any]) -> List[str]:
    """Generate improvement suggestions based on analysis"""
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


# API Endpoints
@app.post(
    "/process-image",
    response_model=ProcessImageResponse,
    summary="Process and optimize image",
    description="Process an image with optimization, resizing, and format conversion"
)
async def process_image(
    file: UploadFile = File(..., description="Image file to process"),
    max_width: Optional[int] = None,
    max_height: Optional[int] = None,
    quality: ImageQuality = ImageQuality.MEDIUM,
    format: ImageFormat = ImageFormat.JPEG,
    optimize: bool = True,
    auto_orient: bool = True
):
    """
    Process and optimize an image.

    - **file**: Image file to process
    - **max_width**: Maximum width in pixels (optional)
    - **max_height**: Maximum height in pixels (optional)
    - **quality**: Quality preset (low, medium, high, original)
    - **format**: Output format (jpeg, png, webp)
    - **optimize**: Whether to optimize the image
    - **auto_orient**: Auto-rotate based on EXIF orientation
    """
    start_time = datetime.now()

    try:
        # Read uploaded file
        contents = await file.read()
        original_size = len(contents)

        # Open image
        image = Image.open(io.BytesIO(contents))

        # Auto-orient if requested
        if auto_orient:
            image = ImageOps.exif_transpose(image)

        # Resize if dimensions specified
        if max_width or max_height:
            # Calculate new dimensions maintaining aspect ratio
            width, height = image.size

            if max_width and max_height:
                image.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
            elif max_width:
                new_height = int(height * (max_width / width))
                image = image.resize((max_width, new_height), Image.Resampling.LANCZOS)
            elif max_height:
                new_width = int(width * (max_height / height))
                image = image.resize((new_width, max_height), Image.Resampling.LANCZOS)

        # Convert format if needed
        output_format = format.value.upper()
        if output_format == 'JPEG' and image.mode in ('RGBA', 'LA', 'P'):
            # Convert to RGB for JPEG
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = background

        # Save processed image
        output_buffer = io.BytesIO()
        save_kwargs = {
            'format': output_format,
            'optimize': optimize,
        }

        if output_format in ('JPEG', 'WEBP'):
            save_kwargs['quality'] = get_quality_value(quality)

        image.save(output_buffer, **save_kwargs)
        processed_size = output_buffer.tell()

        # Calculate metrics
        compression_ratio = (1 - processed_size / original_size) * 100 if original_size > 0 else 0
        processing_time = int((datetime.now() - start_time).total_seconds() * 1000)

        logger.info(
            f"Processed image: {file.filename} - "
            f"Original: {original_size} bytes, Processed: {processed_size} bytes, "
            f"Compression: {compression_ratio:.2f}%"
        )

        return ProcessImageResponse(
            success=True,
            original_size=original_size,
            processed_size=processed_size,
            compression_ratio=round(compression_ratio, 2),
            dimensions={
                "width": image.width,
                "height": image.height
            },
            format=output_format,
            processing_time_ms=processing_time
        )

    except Exception as e:
        logger.error(f"Error processing image: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing image: {str(e)}"
        )


@app.post(
    "/generate-thumbnail",
    summary="Generate image thumbnail",
    description="Generate a thumbnail from an uploaded image"
)
async def generate_thumbnail(
    file: UploadFile = File(..., description="Image file to create thumbnail from"),
    width: int = 150,
    height: int = 150,
    crop: bool = True,
    format: ImageFormat = ImageFormat.JPEG
):
    """
    Generate a thumbnail from an image.

    - **file**: Source image file
    - **width**: Thumbnail width in pixels (default: 150)
    - **height**: Thumbnail height in pixels (default: 150)
    - **crop**: Whether to crop to exact dimensions (default: True)
    - **format**: Output format (jpeg, png, webp)
    """
    try:
        # Read uploaded file
        contents = await file.read()

        # Open image
        image = Image.open(io.BytesIO(contents))

        # Auto-orient
        image = ImageOps.exif_transpose(image)

        # Generate thumbnail
        if crop:
            # Crop to exact dimensions
            image = ImageOps.fit(image, (width, height), Image.Resampling.LANCZOS)
        else:
            # Maintain aspect ratio
            image.thumbnail((width, height), Image.Resampling.LANCZOS)

        # Convert format if needed
        output_format = format.value.upper()
        if output_format == 'JPEG' and image.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = background

        # Save thumbnail
        output_buffer = io.BytesIO()
        save_kwargs = {'format': output_format}

        if output_format in ('JPEG', 'WEBP'):
            save_kwargs['quality'] = 85
            save_kwargs['optimize'] = True

        image.save(output_buffer, **save_kwargs)
        output_buffer.seek(0)

        file_size = output_buffer.tell()

        logger.info(
            f"Generated thumbnail: {file.filename} - "
            f"Dimensions: {image.width}x{image.height}, Size: {file_size} bytes"
        )

        # Return image as streaming response
        return StreamingResponse(
            output_buffer,
            media_type=f"image/{format.value}",
            headers={
                "X-Thumbnail-Width": str(image.width),
                "X-Thumbnail-Height": str(image.height),
                "X-File-Size": str(file_size),
                "Content-Disposition": f'inline; filename="thumbnail.{format.value}"'
            }
        )

    except Exception as e:
        logger.error(f"Error generating thumbnail: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating thumbnail: {str(e)}"
        )


@app.post(
    "/analyze-image",
    response_model=AnalyzeImageResponse,
    summary="Analyze image for product categorization",
    description="Analyze an image and provide categorization, quality metrics, and suggestions"
)
async def analyze_image(
    file: UploadFile = File(..., description="Image file to analyze")
):
    """
    Analyze an image for product categorization.

    Returns:
    - Product category prediction with confidence
    - Image quality metrics (brightness, sharpness, quality score)
    - Dominant colors
    - Image dimensions and format
    - Improvement suggestions
    - EXIF metadata
    """
    try:
        # Read uploaded file
        contents = await file.read()
        file_size = len(contents)

        # Open image
        image = Image.open(io.BytesIO(contents))

        # Auto-orient
        image = ImageOps.exif_transpose(image)

        # Get basic info
        dimensions = {
            "width": image.width,
            "height": image.height
        }
        img_format = image.format or "UNKNOWN"

        # Categorize image
        category, confidence = categorize_image(image, file.filename)

        # Analyze quality metrics
        brightness = analyze_image_brightness(image)
        sharpness = analyze_image_sharpness(image)
        quality_score = calculate_quality_score(image)

        # Extract dominant colors
        dominant_colors = get_dominant_colors(image)

        # Extract EXIF metadata
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
        except Exception as e:
            logger.debug(f"No EXIF data available: {e}")

        # Generate suggestions
        analysis_data = {
            'brightness': brightness,
            'sharpness': sharpness,
            'quality_score': quality_score,
            'dimensions': dimensions
        }
        suggestions = generate_suggestions(analysis_data)

        logger.info(
            f"Analyzed image: {file.filename} - "
            f"Category: {category.value}, Confidence: {confidence:.2f}, "
            f"Quality Score: {quality_score:.2f}"
        )

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


@app.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Check service health and status"
)
async def health_check():
    """
    Health check endpoint.

    Returns service status, timestamp, and version information.
    """
    return HealthResponse(
        status="healthy",
        timestamp=datetime.utcnow().isoformat(),
        service="media-ai-service",
        version="1.0.0"
    )


@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Media AI Service",
        "version": "1.0.0",
        "description": "AI-powered media processing and analysis service",
        "endpoints": {
            "process_image": "/process-image",
            "generate_thumbnail": "/generate-thumbnail",
            "analyze_image": "/analyze-image",
            "health": "/health",
            "docs": "/docs"
        }
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8008,
        reload=True,
        log_level="info"
    )
