"""
Notification Service - FastAPI Application

This service provides multi-channel notification capabilities including:
- Email notifications
- SMS notifications
- Push notifications
- Notification templates and scheduling
- Delivery tracking and analytics
"""

import os
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional, List, Dict, Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query, Path, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Configure structured logging
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
LOG_FORMAT = os.getenv('LOG_FORMAT', 'json')


class StructuredFormatter(logging.Formatter):
    """Custom formatter for structured JSON logging"""
    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "service": "notification-service",
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

# In-memory storage (replace with database in production)
notifications: Dict[str, Dict] = {}
templates: Dict[str, Dict] = {}
subscriptions: Dict[str, Dict] = {}


# ============================================
# Enums and Constants
# ============================================

class NotificationChannel(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    PUSH = "push"
    IN_APP = "in_app"
    WEBHOOK = "webhook"


class NotificationStatus(str, Enum):
    PENDING = "pending"
    QUEUED = "queued"
    SENT = "sent"
    DELIVERED = "delivered"
    FAILED = "failed"
    BOUNCED = "bounced"


class NotificationType(str, Enum):
    TRANSACTIONAL = "transactional"
    MARKETING = "marketing"
    ALERT = "alert"
    REMINDER = "reminder"
    SYSTEM = "system"


class Priority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


# ============================================
# Lifespan Manager
# ============================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("Notification Service starting up...")
    _initialize_sample_templates()
    logger.info("Notification Service initialized successfully")
    yield
    logger.info("Notification Service shutting down...")


# Initialize FastAPI app with lifespan
app = FastAPI(
    title="CitadelBuy Notification Service",
    description="Multi-channel notification service for email, SMS, and push notifications",
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
# Pydantic Models
# ============================================

class EmailNotification(BaseModel):
    to: List[str] = Field(..., min_length=1, description="List of email recipients")
    subject: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1)
    html_body: Optional[str] = None
    template_id: Optional[str] = None
    template_data: Optional[Dict[str, Any]] = None
    cc: Optional[List[str]] = None
    bcc: Optional[List[str]] = None
    attachments: Optional[List[Dict[str, str]]] = None
    priority: Priority = Priority.NORMAL
    notification_type: NotificationType = NotificationType.TRANSACTIONAL
    scheduled_at: Optional[str] = None


class SMSNotification(BaseModel):
    to: str = Field(..., min_length=10, max_length=15, description="Phone number")
    message: str = Field(..., min_length=1, max_length=1600)
    template_id: Optional[str] = None
    template_data: Optional[Dict[str, Any]] = None
    priority: Priority = Priority.NORMAL
    notification_type: NotificationType = NotificationType.TRANSACTIONAL
    scheduled_at: Optional[str] = None


class PushNotification(BaseModel):
    user_id: str = Field(..., description="User ID for push notification")
    device_tokens: Optional[List[str]] = None
    title: str = Field(..., min_length=1, max_length=100)
    body: str = Field(..., min_length=1, max_length=500)
    data: Optional[Dict[str, Any]] = None
    image_url: Optional[str] = None
    action_url: Optional[str] = None
    priority: Priority = Priority.NORMAL
    notification_type: NotificationType = NotificationType.TRANSACTIONAL
    ttl: Optional[int] = Field(None, description="Time to live in seconds")


class BulkNotification(BaseModel):
    channel: NotificationChannel
    recipients: List[Dict[str, Any]] = Field(..., description="List of recipients with their details")
    template_id: str
    template_data: Optional[Dict[str, Any]] = None
    priority: Priority = Priority.NORMAL
    notification_type: NotificationType = NotificationType.MARKETING


class NotificationTemplate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    channel: NotificationChannel
    subject: Optional[str] = None
    body: str = Field(..., min_length=1)
    html_body: Optional[str] = None
    variables: Optional[List[str]] = Field(None, description="List of template variables")
    metadata: Optional[Dict[str, Any]] = None


class NotificationPreferences(BaseModel):
    user_id: str
    email_enabled: bool = True
    sms_enabled: bool = True
    push_enabled: bool = True
    marketing_enabled: bool = False
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    preferred_channels: Optional[List[NotificationChannel]] = None


# ============================================
# Health Check Endpoint
# ============================================

@app.get("/health")
async def health_check():
    """Service health check endpoint."""
    return {
        "status": "healthy",
        "service": "notification-service",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }


# ============================================
# Email Notification Endpoints
# ============================================

@app.post("/api/v1/notifications/email", response_model=Dict[str, Any], status_code=201)
async def send_email(
    notification: EmailNotification,
    background_tasks: BackgroundTasks
):
    """Send an email notification."""
    notification_id = str(uuid4())

    body = notification.body
    html_body = notification.html_body
    if notification.template_id:
        template = templates.get(notification.template_id)
        if template:
            body = _process_template(template.get("body", ""), notification.template_data or {})
            html_body = _process_template(template.get("html_body", ""), notification.template_data or {})

    notification_record = {
        "id": notification_id,
        "channel": NotificationChannel.EMAIL.value,
        "to": notification.to,
        "cc": notification.cc,
        "bcc": notification.bcc,
        "subject": notification.subject,
        "body": body,
        "html_body": html_body,
        "priority": notification.priority.value,
        "notification_type": notification.notification_type.value,
        "status": NotificationStatus.QUEUED.value,
        "scheduled_at": notification.scheduled_at,
        "created_at": datetime.utcnow().isoformat(),
        "sent_at": None,
        "delivered_at": None,
        "error": None,
        "metadata": {
            "template_id": notification.template_id,
            "attachments_count": len(notification.attachments) if notification.attachments else 0
        }
    }

    notifications[notification_id] = notification_record
    background_tasks.add_task(_simulate_send_notification, notification_id)

    logger.info(f"Email notification queued: {notification_id}, to: {notification.to}")

    return {
        "success": True,
        "message": "Email notification queued successfully",
        "data": {
            "notification_id": notification_id,
            "status": NotificationStatus.QUEUED.value,
            "recipients": len(notification.to),
            "scheduled_at": notification.scheduled_at
        }
    }


# ============================================
# SMS Notification Endpoints
# ============================================

@app.post("/api/v1/notifications/sms", response_model=Dict[str, Any], status_code=201)
async def send_sms(
    notification: SMSNotification,
    background_tasks: BackgroundTasks
):
    """Send an SMS notification."""
    notification_id = str(uuid4())

    message = notification.message
    if notification.template_id:
        template = templates.get(notification.template_id)
        if template:
            message = _process_template(template.get("body", ""), notification.template_data or {})

    notification_record = {
        "id": notification_id,
        "channel": NotificationChannel.SMS.value,
        "to": notification.to,
        "message": message,
        "priority": notification.priority.value,
        "notification_type": notification.notification_type.value,
        "status": NotificationStatus.QUEUED.value,
        "scheduled_at": notification.scheduled_at,
        "created_at": datetime.utcnow().isoformat(),
        "sent_at": None,
        "delivered_at": None,
        "error": None,
        "metadata": {
            "template_id": notification.template_id,
            "message_length": len(message)
        }
    }

    notifications[notification_id] = notification_record
    background_tasks.add_task(_simulate_send_notification, notification_id)

    logger.info(f"SMS notification queued: {notification_id}, to: {notification.to}")

    return {
        "success": True,
        "message": "SMS notification queued successfully",
        "data": {
            "notification_id": notification_id,
            "status": NotificationStatus.QUEUED.value,
            "message_segments": (len(message) // 160) + 1
        }
    }


# ============================================
# Push Notification Endpoints
# ============================================

@app.post("/api/v1/notifications/push", response_model=Dict[str, Any], status_code=201)
async def send_push(
    notification: PushNotification,
    background_tasks: BackgroundTasks
):
    """Send a push notification."""
    notification_id = str(uuid4())

    notification_record = {
        "id": notification_id,
        "channel": NotificationChannel.PUSH.value,
        "user_id": notification.user_id,
        "device_tokens": notification.device_tokens or [],
        "title": notification.title,
        "body": notification.body,
        "data": notification.data,
        "image_url": notification.image_url,
        "action_url": notification.action_url,
        "priority": notification.priority.value,
        "notification_type": notification.notification_type.value,
        "status": NotificationStatus.QUEUED.value,
        "ttl": notification.ttl,
        "created_at": datetime.utcnow().isoformat(),
        "sent_at": None,
        "delivered_at": None,
        "error": None
    }

    notifications[notification_id] = notification_record
    background_tasks.add_task(_simulate_send_notification, notification_id)

    logger.info(f"Push notification queued: {notification_id}, user: {notification.user_id}")

    return {
        "success": True,
        "message": "Push notification queued successfully",
        "data": {
            "notification_id": notification_id,
            "status": NotificationStatus.QUEUED.value,
            "devices": len(notification.device_tokens) if notification.device_tokens else 0
        }
    }


# ============================================
# Bulk Notification Endpoints
# ============================================

@app.post("/api/v1/notifications/bulk", response_model=Dict[str, Any], status_code=201)
async def send_bulk_notifications(
    notification: BulkNotification,
    background_tasks: BackgroundTasks
):
    """Send bulk notifications to multiple recipients."""
    batch_id = str(uuid4())
    notification_ids = []

    for recipient in notification.recipients[:1000]:
        notification_id = str(uuid4())

        notification_record = {
            "id": notification_id,
            "batch_id": batch_id,
            "channel": notification.channel.value,
            "recipient": recipient,
            "template_id": notification.template_id,
            "priority": notification.priority.value,
            "notification_type": notification.notification_type.value,
            "status": NotificationStatus.PENDING.value,
            "created_at": datetime.utcnow().isoformat(),
            "sent_at": None,
            "delivered_at": None,
            "error": None
        }

        notifications[notification_id] = notification_record
        notification_ids.append(notification_id)

    background_tasks.add_task(_process_bulk_notifications, batch_id, notification_ids)

    logger.info(f"Bulk notifications queued: batch={batch_id}, count={len(notification_ids)}")

    return {
        "success": True,
        "message": "Bulk notifications queued successfully",
        "data": {
            "batch_id": batch_id,
            "total_recipients": len(notification_ids),
            "status": "processing",
            "estimated_completion": (datetime.utcnow() + timedelta(minutes=5)).isoformat()
        }
    }


# ============================================
# Notification Status and History Endpoints
# ============================================

@app.get("/api/v1/notifications", response_model=Dict[str, Any])
async def list_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    channel: Optional[NotificationChannel] = None,
    status: Optional[NotificationStatus] = None,
    notification_type: Optional[NotificationType] = None,
    user_id: Optional[str] = None
):
    """List notifications with pagination and filters."""
    items = list(notifications.values())

    if channel:
        items = [n for n in items if n.get("channel") == channel.value]
    if status:
        items = [n for n in items if n.get("status") == status.value]
    if notification_type:
        items = [n for n in items if n.get("notification_type") == notification_type.value]
    if user_id:
        items = [n for n in items if n.get("user_id") == user_id]

    items.sort(key=lambda x: x.get("created_at", ""), reverse=True)

    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    paginated_items = items[start:end]

    return {
        "success": True,
        "data": paginated_items,
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size
        }
    }


@app.get("/api/v1/notifications/{notification_id}", response_model=Dict[str, Any])
async def get_notification(notification_id: str = Path(..., description="Notification ID")):
    """Get a single notification by ID."""
    if notification_id not in notifications:
        raise HTTPException(status_code=404, detail="Notification not found")

    return {
        "success": True,
        "data": notifications[notification_id]
    }


@app.get("/api/v1/notifications/{notification_id}/status", response_model=Dict[str, Any])
async def get_notification_status(notification_id: str = Path(..., description="Notification ID")):
    """Get the delivery status of a notification."""
    if notification_id not in notifications:
        raise HTTPException(status_code=404, detail="Notification not found")

    n = notifications[notification_id]

    return {
        "success": True,
        "data": {
            "notification_id": notification_id,
            "channel": n.get("channel"),
            "status": n.get("status"),
            "created_at": n.get("created_at"),
            "sent_at": n.get("sent_at"),
            "delivered_at": n.get("delivered_at"),
            "error": n.get("error")
        }
    }


# ============================================
# Template Management Endpoints
# ============================================

@app.post("/api/v1/templates", response_model=Dict[str, Any], status_code=201)
async def create_template(template: NotificationTemplate):
    """Create a notification template."""
    template_id = str(uuid4())

    template_record = {
        "id": template_id,
        "name": template.name,
        "channel": template.channel.value,
        "subject": template.subject,
        "body": template.body,
        "html_body": template.html_body,
        "variables": template.variables or [],
        "metadata": template.metadata or {},
        "is_active": True,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }

    templates[template_id] = template_record
    logger.info(f"Template created: {template_id}, name: {template.name}")

    return {
        "success": True,
        "message": "Template created successfully",
        "data": template_record
    }


@app.get("/api/v1/templates", response_model=Dict[str, Any])
async def list_templates(
    channel: Optional[NotificationChannel] = None,
    active_only: bool = True
):
    """List all notification templates."""
    items = list(templates.values())

    if channel:
        items = [t for t in items if t.get("channel") == channel.value]
    if active_only:
        items = [t for t in items if t.get("is_active")]

    return {
        "success": True,
        "data": items,
        "total": len(items)
    }


@app.get("/api/v1/templates/{template_id}", response_model=Dict[str, Any])
async def get_template(template_id: str = Path(..., description="Template ID")):
    """Get a template by ID."""
    if template_id not in templates:
        raise HTTPException(status_code=404, detail="Template not found")

    return {
        "success": True,
        "data": templates[template_id]
    }


@app.put("/api/v1/templates/{template_id}", response_model=Dict[str, Any])
async def update_template(
    template_id: str = Path(..., description="Template ID"),
    template: NotificationTemplate = None
):
    """Update a notification template."""
    if template_id not in templates:
        raise HTTPException(status_code=404, detail="Template not found")

    t = templates[template_id]
    t["name"] = template.name
    t["channel"] = template.channel.value
    t["subject"] = template.subject
    t["body"] = template.body
    t["html_body"] = template.html_body
    t["variables"] = template.variables or []
    t["metadata"] = template.metadata or {}
    t["updated_at"] = datetime.utcnow().isoformat()

    logger.info(f"Template updated: {template_id}")

    return {
        "success": True,
        "message": "Template updated successfully",
        "data": t
    }


@app.delete("/api/v1/templates/{template_id}", response_model=Dict[str, Any])
async def delete_template(template_id: str = Path(..., description="Template ID")):
    """Delete (deactivate) a template."""
    if template_id not in templates:
        raise HTTPException(status_code=404, detail="Template not found")

    templates[template_id]["is_active"] = False
    templates[template_id]["updated_at"] = datetime.utcnow().isoformat()

    logger.info(f"Template deleted: {template_id}")

    return {
        "success": True,
        "message": "Template deleted successfully",
        "data": {"id": template_id}
    }


# ============================================
# Subscription Management Endpoints
# ============================================

@app.post("/api/v1/subscriptions", response_model=Dict[str, Any], status_code=201)
async def create_subscription(preferences: NotificationPreferences):
    """Create or update notification preferences for a user."""
    subscription_record = {
        "user_id": preferences.user_id,
        "email_enabled": preferences.email_enabled,
        "sms_enabled": preferences.sms_enabled,
        "push_enabled": preferences.push_enabled,
        "marketing_enabled": preferences.marketing_enabled,
        "quiet_hours_start": preferences.quiet_hours_start,
        "quiet_hours_end": preferences.quiet_hours_end,
        "preferred_channels": [c.value for c in (preferences.preferred_channels or [])],
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }

    subscriptions[preferences.user_id] = subscription_record
    logger.info(f"Subscription created/updated: user={preferences.user_id}")

    return {
        "success": True,
        "message": "Subscription preferences saved successfully",
        "data": subscription_record
    }


@app.get("/api/v1/subscriptions/{user_id}", response_model=Dict[str, Any])
async def get_subscription(user_id: str = Path(..., description="User ID")):
    """Get notification preferences for a user."""
    if user_id not in subscriptions:
        return {
            "success": True,
            "data": {
                "user_id": user_id,
                "email_enabled": True,
                "sms_enabled": True,
                "push_enabled": True,
                "marketing_enabled": False,
                "quiet_hours_start": None,
                "quiet_hours_end": None,
                "preferred_channels": []
            }
        }

    return {
        "success": True,
        "data": subscriptions[user_id]
    }


@app.post("/api/v1/subscriptions/{user_id}/unsubscribe", response_model=Dict[str, Any])
async def unsubscribe(
    user_id: str = Path(..., description="User ID"),
    channels: Optional[List[NotificationChannel]] = None
):
    """Unsubscribe user from specific channels or all."""
    if user_id not in subscriptions:
        subscriptions[user_id] = {
            "user_id": user_id,
            "email_enabled": True,
            "sms_enabled": True,
            "push_enabled": True,
            "marketing_enabled": False
        }

    sub = subscriptions[user_id]

    if channels:
        for channel in channels:
            if channel == NotificationChannel.EMAIL:
                sub["email_enabled"] = False
            elif channel == NotificationChannel.SMS:
                sub["sms_enabled"] = False
            elif channel == NotificationChannel.PUSH:
                sub["push_enabled"] = False
    else:
        sub["email_enabled"] = False
        sub["sms_enabled"] = False
        sub["push_enabled"] = False
        sub["marketing_enabled"] = False

    sub["updated_at"] = datetime.utcnow().isoformat()

    logger.info(f"User unsubscribed: {user_id}, channels: {channels}")

    return {
        "success": True,
        "message": "Unsubscribed successfully",
        "data": sub
    }


# ============================================
# Analytics Endpoints
# ============================================

@app.get("/api/v1/analytics/summary", response_model=Dict[str, Any])
async def get_analytics_summary(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
):
    """Get notification analytics summary."""
    all_notifications = list(notifications.values())

    by_channel = {}
    by_status = {}
    by_type = {}

    for n in all_notifications:
        channel = n.get("channel", "unknown")
        by_channel[channel] = by_channel.get(channel, 0) + 1

        status_val = n.get("status", "unknown")
        by_status[status_val] = by_status.get(status_val, 0) + 1

        ntype = n.get("notification_type", "unknown")
        by_type[ntype] = by_type.get(ntype, 0) + 1

    sent_count = by_status.get(NotificationStatus.SENT.value, 0) + by_status.get(NotificationStatus.DELIVERED.value, 0)
    failed_count = by_status.get(NotificationStatus.FAILED.value, 0) + by_status.get(NotificationStatus.BOUNCED.value, 0)
    total = len(all_notifications)

    delivery_rate = (sent_count / total * 100) if total > 0 else 0

    return {
        "success": True,
        "data": {
            "total_notifications": total,
            "by_channel": by_channel,
            "by_status": by_status,
            "by_type": by_type,
            "delivery_rate": round(delivery_rate, 2),
            "sent_count": sent_count,
            "failed_count": failed_count
        }
    }


# ============================================
# Root Endpoint
# ============================================

@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "CitadelBuy Notification Service",
        "version": "1.0.0",
        "description": "Multi-channel notification service for email, SMS, and push notifications",
        "endpoints": {
            "health": "/health",
            "email": "/api/v1/notifications/email",
            "sms": "/api/v1/notifications/sms",
            "push": "/api/v1/notifications/push",
            "bulk": "/api/v1/notifications/bulk",
            "templates": "/api/v1/templates",
            "subscriptions": "/api/v1/subscriptions",
            "analytics": "/api/v1/analytics/summary",
            "docs": "/docs"
        }
    }


# ============================================
# Helper Functions
# ============================================

def _initialize_sample_templates():
    """Initialize sample notification templates."""
    global templates

    sample_templates = [
        {
            "id": "order-confirmation",
            "name": "Order Confirmation",
            "channel": NotificationChannel.EMAIL.value,
            "subject": "Your Order #{order_id} has been confirmed",
            "body": "Hello {customer_name},\n\nYour order #{order_id} has been confirmed. Total: ${total}",
            "html_body": "<h1>Order Confirmed</h1><p>Hello {customer_name},</p><p>Your order #{order_id} has been confirmed.</p>",
            "variables": ["customer_name", "order_id", "total"],
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        },
        {
            "id": "shipping-update",
            "name": "Shipping Update",
            "channel": NotificationChannel.SMS.value,
            "subject": None,
            "body": "Your order #{order_id} has shipped! Track: {tracking_url}",
            "html_body": None,
            "variables": ["order_id", "tracking_url"],
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        },
        {
            "id": "welcome",
            "name": "Welcome Email",
            "channel": NotificationChannel.EMAIL.value,
            "subject": "Welcome to CitadelBuy!",
            "body": "Hello {customer_name},\n\nWelcome to CitadelBuy! We're excited to have you.",
            "html_body": "<h1>Welcome!</h1><p>Hello {customer_name},</p><p>We're excited to have you!</p>",
            "variables": ["customer_name"],
            "is_active": True,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
    ]

    for template in sample_templates:
        templates[template["id"]] = template


def _process_template(template: str, data: Dict[str, Any]) -> str:
    """Process template by replacing variables with data."""
    result = template
    for key, value in data.items():
        result = result.replace("{" + key + "}", str(value))
    return result


async def _simulate_send_notification(notification_id: str):
    """Simulate sending a notification."""
    import asyncio
    import random
    await asyncio.sleep(1)

    if notification_id in notifications:
        n = notifications[notification_id]
        n["status"] = NotificationStatus.SENT.value
        n["sent_at"] = datetime.utcnow().isoformat()

        if random.random() < 0.8:
            await asyncio.sleep(0.5)
            n["status"] = NotificationStatus.DELIVERED.value
            n["delivered_at"] = datetime.utcnow().isoformat()
        else:
            n["status"] = NotificationStatus.FAILED.value
            n["error"] = "Delivery failed - simulated error"

        logger.info(f"Notification {notification_id} processed: status={n['status']}")


async def _process_bulk_notifications(batch_id: str, notification_ids: List[str]):
    """Process bulk notifications in background."""
    import asyncio
    for nid in notification_ids:
        if nid in notifications:
            notifications[nid]["status"] = NotificationStatus.QUEUED.value
            await asyncio.sleep(0.1)
            await _simulate_send_notification(nid)

    logger.info(f"Bulk notification batch {batch_id} completed")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8009"))
    uvicorn.run(app, host="0.0.0.0", port=port)
