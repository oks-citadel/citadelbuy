# Personalization Service

## Overview

The Personalization Service provides user-specific experiences across the Broxiva platform. It manages user preferences, behavior tracking, personalized content, and adaptive UI to create tailored shopping experiences for each customer.

## Key Features

### User Preferences
- **Preference Management**: Store and manage user preferences
- **Communication Preferences**: Email, SMS, push notification settings
- **Display Preferences**: Theme, language, currency
- **Privacy Settings**: Data sharing and tracking preferences

### Behavioral Personalization
- **Browsing History**: Track and analyze browsing patterns
- **Purchase History**: Analyze buying behavior
- **Search History**: Understand search patterns
- **Engagement Tracking**: Monitor user engagement

### Content Personalization
- **Homepage Customization**: Personalized homepage layout
- **Product Recommendations**: User-specific product suggestions
- **Email Personalization**: Tailored email content
- **Search Results**: Personalized search rankings

### Adaptive Features
- **Dynamic Pricing**: User-specific pricing (if enabled)
- **Personalized Offers**: Targeted promotions and discounts
- **Smart Notifications**: Send notifications at optimal times
- **A/B Testing**: Test different experiences per user

## Environment Variables

```bash
# Service Configuration
LOG_LEVEL=INFO
PORT=8011

# Database (PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/broxiva

# Redis Cache
REDIS_URL=redis://localhost:6379/10
REDIS_PASSWORD=your_redis_password
CACHE_TTL=3600

# Personalization Settings
ENABLE_BEHAVIORAL_TRACKING=true
ENABLE_PREFERENCE_CENTER=true
TRACK_BROWSING_HISTORY=true
BROWSING_HISTORY_LIMIT=100

# Privacy Settings
RESPECT_DO_NOT_TRACK=true
GDPR_COMPLIANT=true
ALLOW_OPT_OUT=true

# Recommendation Integration
RECOMMENDATION_SERVICE_URL=http://recommendation:8001
ENABLE_PERSONALIZED_RECOMMENDATIONS=true

# A/B Testing
ENABLE_AB_TESTING=true
AB_TEST_SAMPLE_SIZE=1000

# Feature Flags
ENABLE_DYNAMIC_PRICING=false
ENABLE_PERSONALIZED_SEARCH=true
ENABLE_SMART_NOTIFICATIONS=true
```

## API Endpoints

### Preferences
- `GET /api/v1/preferences/{user_id}` - Get user preferences
- `PUT /api/v1/preferences/{user_id}` - Update preferences
- `POST /api/v1/preferences/{user_id}/reset` - Reset to defaults

### Behavior Tracking
- `POST /api/v1/behavior/track` - Track user behavior
- `GET /api/v1/behavior/{user_id}/history` - Get behavior history
- `GET /api/v1/behavior/{user_id}/insights` - Get behavioral insights

### Personalization
- `GET /api/v1/personalize/homepage/{user_id}` - Get personalized homepage
- `GET /api/v1/personalize/content/{user_id}` - Get personalized content
- `POST /api/v1/personalize/recommendations/{user_id}` - Get recommendations

### A/B Testing
- `GET /api/v1/ab-test/{user_id}/variant` - Get user's test variant
- `POST /api/v1/ab-test/track` - Track A/B test event

### Health & Monitoring
- `GET /health` - Service health check
- `GET /metrics` - Prometheus metrics

## Dependencies

- FastAPI 0.109.0
- SQLAlchemy 2.0.25
- Redis 5.0.1
- AsyncPG 0.29.0
- Pandas 2.1.4 - Data analysis
- Scikit-learn 1.4.0 - ML models

## Local Development Setup

```bash
cd organization/apps/services/personalization
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8011
```

## Docker Usage

```bash
docker build -t broxiva/personalization:latest .
docker run -p 8011:8011 --env-file .env broxiva/personalization:latest
```

## Usage Examples

### Get User Preferences

```bash
curl http://localhost:8011/api/v1/preferences/user_123
```

Response:
```json
{
  "user_id": "user_123",
  "language": "en",
  "currency": "USD",
  "theme": "dark",
  "notifications": {
    "email": true,
    "sms": false,
    "push": true
  },
  "privacy": {
    "tracking_enabled": true,
    "personalized_ads": true
  }
}
```

### Track User Behavior

```bash
curl -X POST http://localhost:8011/api/v1/behavior/track \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_123",
    "event_type": "product_view",
    "product_id": "prod_456",
    "timestamp": "2025-12-04T10:30:00Z"
  }'
```

### Get Personalized Homepage

```bash
curl http://localhost:8011/api/v1/personalize/homepage/user_123
```

Response:
```json
{
  "user_id": "user_123",
  "sections": [
    {
      "type": "recommended_products",
      "title": "Recommended for You",
      "products": ["prod_1", "prod_2", "prod_3"]
    },
    {
      "type": "recently_viewed",
      "title": "Recently Viewed",
      "products": ["prod_4", "prod_5"]
    },
    {
      "type": "trending",
      "title": "Trending in Electronics",
      "products": ["prod_6", "prod_7"]
    }
  ],
  "layout": "grid",
  "theme": "dark"
}
```

## Privacy & Compliance

### GDPR Compliance
- User data export
- Right to be forgotten
- Consent management
- Data minimization

### Privacy Controls
- Opt-out options
- Do Not Track support
- Cookie preferences
- Data retention policies

## Testing

```bash
pytest tests/ -v
pytest tests/ --cov=src --cov-report=html
```

## API Documentation

- Swagger UI: http://localhost:8011/docs
- ReDoc: http://localhost:8011/redoc

## Support

- Internal Slack: #personalization-support
- Email: personalization@broxiva.com
