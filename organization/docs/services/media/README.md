# Media Management Service

## Overview

The Media Management Service handles all media assets for the CitadelBuy platform including image uploads, processing, optimization, CDN distribution, and video management. It provides fast, optimized media delivery worldwide.

## Key Features

### Image Management
- **Upload & Storage**: Secure image upload and cloud storage
- **Image Optimization**: Automatic compression and format conversion
- **Responsive Images**: Generate multiple sizes for different devices
- **WebP Conversion**: Modern format support for better performance

### Video Management
- **Video Upload**: Upload and transcode videos
- **Streaming**: HLS/DASH adaptive streaming
- **Thumbnails**: Auto-generate video thumbnails
- **Subtitles**: Support for video subtitles

### CDN & Delivery
- **Global CDN**: Fast delivery via CloudFront/Cloudflare
- **Image URLs**: Signed URLs with expiration
- **Lazy Loading**: Optimized image loading
- **Progressive JPEG**: Better user experience

### Processing
- **Bulk Operations**: Process multiple images at once
- **Filters**: Apply filters and effects
- **Watermarking**: Add watermarks to images
- **Face Detection**: Crop images intelligently

## Environment Variables

```bash
# Service Configuration
LOG_LEVEL=INFO
PORT=8008

# Storage
STORAGE_BACKEND=s3  # s3, gcs, azure
AWS_S3_BUCKET=citadelbuy-media
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret

# CDN
CDN_ENABLED=true
CDN_URL=https://cdn.citadelbuy.com
CLOUDFRONT_DISTRIBUTION_ID=your_distribution_id

# Image Processing
MAX_IMAGE_SIZE_MB=10
ALLOWED_FORMATS=jpg,jpeg,png,webp,gif
GENERATE_WEBP=true
IMAGE_QUALITY=85

# Image Sizes
IMAGE_SIZES=thumbnail:150x150,medium:600x600,large:1200x1200

# Video Settings
MAX_VIDEO_SIZE_MB=100
VIDEO_ALLOWED_FORMATS=mp4,webm,mov
ENABLE_VIDEO_TRANSCODING=true

# Feature Flags
ENABLE_IMAGE_OPTIMIZATION=true
ENABLE_FACE_DETECTION=false
ENABLE_WATERMARKING=true
```

## API Endpoints

### Images
- `POST /api/v1/images/upload` - Upload image
- `POST /api/v1/images/upload/bulk` - Bulk upload
- `GET /api/v1/images/{image_id}` - Get image details
- `DELETE /api/v1/images/{image_id}` - Delete image
- `POST /api/v1/images/{image_id}/optimize` - Optimize image

### Videos
- `POST /api/v1/videos/upload` - Upload video
- `GET /api/v1/videos/{video_id}` - Get video details
- `DELETE /api/v1/videos/{video_id}` - Delete video
- `GET /api/v1/videos/{video_id}/thumbnail` - Get video thumbnail

### Processing
- `POST /api/v1/process/resize` - Resize image
- `POST /api/v1/process/crop` - Crop image
- `POST /api/v1/process/watermark` - Add watermark
- `POST /api/v1/process/convert` - Convert format

### Health & Monitoring
- `GET /health` - Service health check
- `GET /metrics` - Prometheus metrics

## Dependencies

- FastAPI 0.109.0
- Pillow 10.2.0 - Image processing
- OpenCV 4.9.0 - Advanced image processing
- Boto3 - AWS S3 client
- Python-magic - File type detection

## Local Development Setup

```bash
cd organization/apps/services/media
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8008
```

## Docker Usage

```bash
docker build -t citadelbuy/media:latest .
docker run -p 8008:8008 --env-file .env citadelbuy/media:latest
```

## Usage Examples

### Upload Image

```bash
curl -X POST http://localhost:8008/api/v1/images/upload \
  -F "file=@product.jpg" \
  -F "category=products"
```

### Get Optimized URL

```bash
curl http://localhost:8008/api/v1/images/img_123?size=medium&format=webp
```

## Testing

```bash
pytest tests/ -v
pytest tests/ --cov=src --cov-report=html
```

## API Documentation

- Swagger UI: http://localhost:8008/docs
- ReDoc: http://localhost:8008/redoc

## Support

- Internal Slack: #media-support
- Email: media@citadelbuy.com
