"""
Notification Service - FastAPI Application

This service provides multi-channel notification capabilities including:
- Email notifications (SendGrid/AWS SES)
- SMS notifications (Twilio)
- Push notifications (Firebase Cloud Messaging)
- Notification templates and scheduling
- Delivery tracking and analytics

Provider integrations are configured via environment variables.
If credentials are not set, the service falls back to simulation mode.
"""

import os
import json
import logging
from abc import ABC, abstractmethod
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum
from typing import Optional, List, Dict, Any
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Query, Path, BackgroundTasks, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


# ============================================
# Provider Configuration Classes
# ============================================

@dataclass
class SendGridConfig:
    """SendGrid email provider configuration"""
    api_key: str
    from_email: str
    from_name: str
    sandbox_mode: bool = False

    @classmethod
    def from_env(cls) -> Optional['SendGridConfig']:
        """Load configuration from environment variables"""
        api_key = os.getenv('SENDGRID_API_KEY')
        if not api_key:
            return None
        return cls(
            api_key=api_key,
            from_email=os.getenv('SENDGRID_FROM_EMAIL', 'noreply@citadelbuy.com'),
            from_name=os.getenv('SENDGRID_FROM_NAME', 'CitadelBuy'),
            sandbox_mode=os.getenv('SENDGRID_SANDBOX_MODE', 'false').lower() == 'true'
        )


@dataclass
class AWSSESConfig:
    """AWS SES email provider configuration"""
    access_key_id: str
    secret_access_key: str
    region: str
    from_email: str
    from_name: str
    configuration_set: Optional[str] = None

    @classmethod
    def from_env(cls) -> Optional['AWSSESConfig']:
        """Load configuration from environment variables"""
        access_key = os.getenv('AWS_SES_ACCESS_KEY_ID') or os.getenv('AWS_ACCESS_KEY_ID')
        secret_key = os.getenv('AWS_SES_SECRET_ACCESS_KEY') or os.getenv('AWS_SECRET_ACCESS_KEY')
        if not access_key or not secret_key:
            return None
        return cls(
            access_key_id=access_key,
            secret_access_key=secret_key,
            region=os.getenv('AWS_SES_REGION', os.getenv('AWS_REGION', 'us-east-1')),
            from_email=os.getenv('AWS_SES_FROM_EMAIL', 'noreply@citadelbuy.com'),
            from_name=os.getenv('AWS_SES_FROM_NAME', 'CitadelBuy'),
            configuration_set=os.getenv('AWS_SES_CONFIGURATION_SET')
        )


@dataclass
class TwilioConfig:
    """Twilio SMS provider configuration"""
    account_sid: str
    auth_token: str
    from_number: str
    messaging_service_sid: Optional[str] = None

    @classmethod
    def from_env(cls) -> Optional['TwilioConfig']:
        """Load configuration from environment variables"""
        account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        auth_token = os.getenv('TWILIO_AUTH_TOKEN')
        from_number = os.getenv('TWILIO_FROM_NUMBER')
        if not account_sid or not auth_token or not from_number:
            return None
        return cls(
            account_sid=account_sid,
            auth_token=auth_token,
            from_number=from_number,
            messaging_service_sid=os.getenv('TWILIO_MESSAGING_SERVICE_SID')
        )


@dataclass
class FCMConfig:
    """Firebase Cloud Messaging configuration"""
    credentials_json: str  # Path to service account JSON or JSON string
    project_id: str

    @classmethod
    def from_env(cls) -> Optional['FCMConfig']:
        """Load configuration from environment variables"""
        # Can be either a path to credentials file or the JSON content itself
        credentials = os.getenv('FIREBASE_CREDENTIALS_JSON') or os.getenv('GOOGLE_APPLICATION_CREDENTIALS')
        project_id = os.getenv('FIREBASE_PROJECT_ID')
        if not credentials or not project_id:
            return None
        return cls(
            credentials_json=credentials,
            project_id=project_id
        )


# ============================================
# Provider Abstract Base Classes
# ============================================

class EmailProvider(ABC):
    """Abstract base class for email providers"""

    @abstractmethod
    async def send_email(
        self,
        to: List[str],
        subject: str,
        body: str,
        html_body: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Dict[str, str]]] = None,
        reply_to: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send an email and return result with message_id"""
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        """Return the provider name for logging"""
        pass


class SMSProvider(ABC):
    """Abstract base class for SMS providers"""

    @abstractmethod
    async def send_sms(
        self,
        to: str,
        message: str,
        media_urls: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Send an SMS and return result with message_id"""
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        """Return the provider name for logging"""
        pass


class PushProvider(ABC):
    """Abstract base class for push notification providers"""

    @abstractmethod
    async def send_push(
        self,
        device_tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        image_url: Optional[str] = None,
        action_url: Optional[str] = None,
        ttl: Optional[int] = None
    ) -> Dict[str, Any]:
        """Send push notification and return result"""
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        """Return the provider name for logging"""
        pass


# ============================================
# Provider Implementations
# ============================================

class SendGridProvider(EmailProvider):
    """SendGrid email provider implementation"""

    def __init__(self, config: SendGridConfig):
        self.config = config
        self._client = None
        self._logger = logging.getLogger(f"{__name__}.SendGridProvider")

    async def _get_client(self):
        """Lazy initialization of SendGrid client"""
        if self._client is None:
            try:
                from sendgrid import SendGridAPIClient
                self._client = SendGridAPIClient(self.config.api_key)
                self._logger.info("SendGrid client initialized successfully")
            except ImportError:
                self._logger.error("SendGrid package not installed. Run: pip install sendgrid")
                raise RuntimeError("SendGrid package not installed")
        return self._client

    async def send_email(
        self,
        to: List[str],
        subject: str,
        body: str,
        html_body: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Dict[str, str]]] = None,
        reply_to: Optional[str] = None
    ) -> Dict[str, Any]:
        try:
            from sendgrid.helpers.mail import Mail, Email, To, Content, Attachment, FileContent, FileName, FileType, Disposition

            client = await self._get_client()

            message = Mail(
                from_email=Email(self.config.from_email, self.config.from_name),
                to_emails=[To(email) for email in to],
                subject=subject
            )

            # Add plain text content
            message.add_content(Content("text/plain", body))

            # Add HTML content if provided
            if html_body:
                message.add_content(Content("text/html", html_body))

            # Add CC recipients
            if cc:
                for email in cc:
                    message.add_cc(Email(email))

            # Add BCC recipients
            if bcc:
                for email in bcc:
                    message.add_bcc(Email(email))

            # Add attachments if provided
            if attachments:
                for att in attachments:
                    attachment = Attachment(
                        FileContent(att.get('content', '')),
                        FileName(att.get('filename', 'attachment')),
                        FileType(att.get('type', 'application/octet-stream')),
                        Disposition('attachment')
                    )
                    message.add_attachment(attachment)

            # Enable sandbox mode if configured
            if self.config.sandbox_mode:
                message.mail_settings = {"sandbox_mode": {"enable": True}}

            response = client.send(message)

            self._logger.info(
                f"SendGrid email sent successfully",
                extra={
                    'recipients': len(to),
                    'status_code': response.status_code,
                    'message_id': response.headers.get('X-Message-Id', 'unknown')
                }
            )

            return {
                'success': True,
                'provider': 'sendgrid',
                'message_id': response.headers.get('X-Message-Id'),
                'status_code': response.status_code
            }

        except Exception as e:
            self._logger.error(f"SendGrid email failed: {str(e)}", exc_info=True)
            return {
                'success': False,
                'provider': 'sendgrid',
                'error': str(e)
            }

    def get_provider_name(self) -> str:
        return "sendgrid"


class AWSSESProvider(EmailProvider):
    """AWS SES email provider implementation"""

    def __init__(self, config: AWSSESConfig):
        self.config = config
        self._client = None
        self._logger = logging.getLogger(f"{__name__}.AWSSESProvider")

    async def _get_client(self):
        """Lazy initialization of AWS SES client"""
        if self._client is None:
            try:
                import boto3
                self._client = boto3.client(
                    'ses',
                    aws_access_key_id=self.config.access_key_id,
                    aws_secret_access_key=self.config.secret_access_key,
                    region_name=self.config.region
                )
                self._logger.info(f"AWS SES client initialized for region {self.config.region}")
            except ImportError:
                self._logger.error("boto3 package not installed. Run: pip install boto3")
                raise RuntimeError("boto3 package not installed")
        return self._client

    async def send_email(
        self,
        to: List[str],
        subject: str,
        body: str,
        html_body: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Dict[str, str]]] = None,
        reply_to: Optional[str] = None
    ) -> Dict[str, Any]:
        try:
            import asyncio

            client = await self._get_client()

            destination = {'ToAddresses': to}
            if cc:
                destination['CcAddresses'] = cc
            if bcc:
                destination['BccAddresses'] = bcc

            message_body = {'Text': {'Data': body, 'Charset': 'UTF-8'}}
            if html_body:
                message_body['Html'] = {'Data': html_body, 'Charset': 'UTF-8'}

            send_args = {
                'Source': f"{self.config.from_name} <{self.config.from_email}>",
                'Destination': destination,
                'Message': {
                    'Subject': {'Data': subject, 'Charset': 'UTF-8'},
                    'Body': message_body
                }
            }

            if reply_to:
                send_args['ReplyToAddresses'] = [reply_to]

            if self.config.configuration_set:
                send_args['ConfigurationSetName'] = self.config.configuration_set

            # Run synchronous boto3 call in executor to avoid blocking
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(None, lambda: client.send_email(**send_args))

            self._logger.info(
                f"AWS SES email sent successfully",
                extra={
                    'recipients': len(to),
                    'message_id': response['MessageId']
                }
            )

            return {
                'success': True,
                'provider': 'aws_ses',
                'message_id': response['MessageId']
            }

        except Exception as e:
            self._logger.error(f"AWS SES email failed: {str(e)}", exc_info=True)
            return {
                'success': False,
                'provider': 'aws_ses',
                'error': str(e)
            }

    def get_provider_name(self) -> str:
        return "aws_ses"


class TwilioProvider(SMSProvider):
    """Twilio SMS provider implementation"""

    def __init__(self, config: TwilioConfig):
        self.config = config
        self._client = None
        self._logger = logging.getLogger(f"{__name__}.TwilioProvider")

    async def _get_client(self):
        """Lazy initialization of Twilio client"""
        if self._client is None:
            try:
                from twilio.rest import Client
                self._client = Client(self.config.account_sid, self.config.auth_token)
                self._logger.info("Twilio client initialized successfully")
            except ImportError:
                self._logger.error("Twilio package not installed. Run: pip install twilio")
                raise RuntimeError("Twilio package not installed")
        return self._client

    async def send_sms(
        self,
        to: str,
        message: str,
        media_urls: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        try:
            import asyncio

            client = await self._get_client()

            send_args = {
                'body': message,
                'to': to
            }

            # Use messaging service if configured, otherwise use from number
            if self.config.messaging_service_sid:
                send_args['messaging_service_sid'] = self.config.messaging_service_sid
            else:
                send_args['from_'] = self.config.from_number

            # Add media URLs for MMS if provided
            if media_urls:
                send_args['media_url'] = media_urls

            # Run synchronous Twilio call in executor to avoid blocking
            loop = asyncio.get_event_loop()
            twilio_message = await loop.run_in_executor(
                None,
                lambda: client.messages.create(**send_args)
            )

            self._logger.info(
                f"Twilio SMS sent successfully",
                extra={
                    'to': to,
                    'message_sid': twilio_message.sid,
                    'status': twilio_message.status
                }
            )

            return {
                'success': True,
                'provider': 'twilio',
                'message_id': twilio_message.sid,
                'status': twilio_message.status,
                'segments': twilio_message.num_segments if hasattr(twilio_message, 'num_segments') else 1
            }

        except Exception as e:
            self._logger.error(f"Twilio SMS failed: {str(e)}", exc_info=True)
            return {
                'success': False,
                'provider': 'twilio',
                'error': str(e)
            }

    def get_provider_name(self) -> str:
        return "twilio"


class FCMProvider(PushProvider):
    """Firebase Cloud Messaging provider implementation"""

    def __init__(self, config: FCMConfig):
        self.config = config
        self._initialized = False
        self._logger = logging.getLogger(f"{__name__}.FCMProvider")

    async def _initialize(self):
        """Initialize Firebase Admin SDK"""
        if self._initialized:
            return

        try:
            import firebase_admin
            from firebase_admin import credentials

            # Check if already initialized
            try:
                firebase_admin.get_app()
                self._initialized = True
                return
            except ValueError:
                pass

            # Load credentials from JSON file or string
            if os.path.isfile(self.config.credentials_json):
                cred = credentials.Certificate(self.config.credentials_json)
            else:
                # Assume it's a JSON string
                import json
                cred_dict = json.loads(self.config.credentials_json)
                cred = credentials.Certificate(cred_dict)

            firebase_admin.initialize_app(cred, {
                'projectId': self.config.project_id
            })

            self._initialized = True
            self._logger.info(f"Firebase Admin SDK initialized for project {self.config.project_id}")

        except ImportError:
            self._logger.error("firebase-admin package not installed. Run: pip install firebase-admin")
            raise RuntimeError("firebase-admin package not installed")

    async def send_push(
        self,
        device_tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        image_url: Optional[str] = None,
        action_url: Optional[str] = None,
        ttl: Optional[int] = None
    ) -> Dict[str, Any]:
        try:
            import asyncio
            await self._initialize()

            from firebase_admin import messaging

            # Build notification
            notification = messaging.Notification(
                title=title,
                body=body,
                image=image_url
            )

            # Build Android config
            android_config = messaging.AndroidConfig(
                ttl=timedelta(seconds=ttl) if ttl else None,
                priority='high',
                notification=messaging.AndroidNotification(
                    click_action=action_url
                ) if action_url else None
            )

            # Build APNS config for iOS
            apns_config = messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(
                        alert=messaging.ApsAlert(title=title, body=body),
                        sound='default'
                    )
                )
            )

            # Build web push config
            webpush_config = messaging.WebpushConfig(
                notification=messaging.WebpushNotification(
                    title=title,
                    body=body,
                    icon=image_url
                ),
                fcm_options=messaging.WebpushFCMOptions(link=action_url) if action_url else None
            )

            # Prepare data payload - FCM requires all values to be strings
            data_payload = None
            if data:
                data_payload = {k: str(v) for k, v in data.items()}
            if action_url:
                data_payload = data_payload or {}
                data_payload['action_url'] = action_url

            results = {'success_count': 0, 'failure_count': 0, 'responses': []}

            if len(device_tokens) == 1:
                # Single message
                message = messaging.Message(
                    notification=notification,
                    data=data_payload,
                    token=device_tokens[0],
                    android=android_config,
                    apns=apns_config,
                    webpush=webpush_config
                )

                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(None, lambda: messaging.send(message))

                results['success_count'] = 1
                results['responses'].append({'token': device_tokens[0], 'message_id': response})

            else:
                # Multicast message (up to 500 tokens)
                message = messaging.MulticastMessage(
                    notification=notification,
                    data=data_payload,
                    tokens=device_tokens[:500],  # FCM limit
                    android=android_config,
                    apns=apns_config,
                    webpush=webpush_config
                )

                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(None, lambda: messaging.send_multicast(message))

                results['success_count'] = response.success_count
                results['failure_count'] = response.failure_count

                for idx, send_response in enumerate(response.responses):
                    if send_response.success:
                        results['responses'].append({
                            'token': device_tokens[idx],
                            'message_id': send_response.message_id
                        })
                    else:
                        results['responses'].append({
                            'token': device_tokens[idx],
                            'error': str(send_response.exception)
                        })

            self._logger.info(
                f"FCM push notifications sent",
                extra={
                    'total_tokens': len(device_tokens),
                    'success_count': results['success_count'],
                    'failure_count': results['failure_count']
                }
            )

            return {
                'success': results['failure_count'] == 0,
                'provider': 'fcm',
                'success_count': results['success_count'],
                'failure_count': results['failure_count'],
                'responses': results['responses']
            }

        except Exception as e:
            self._logger.error(f"FCM push notification failed: {str(e)}", exc_info=True)
            return {
                'success': False,
                'provider': 'fcm',
                'error': str(e)
            }

    def get_provider_name(self) -> str:
        return "fcm"


class SimulatedEmailProvider(EmailProvider):
    """Simulated email provider for development/testing"""

    def __init__(self):
        self._logger = logging.getLogger(f"{__name__}.SimulatedEmailProvider")

    async def send_email(
        self,
        to: List[str],
        subject: str,
        body: str,
        html_body: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[Dict[str, str]]] = None,
        reply_to: Optional[str] = None
    ) -> Dict[str, Any]:
        import asyncio
        await asyncio.sleep(0.5)  # Simulate network delay

        message_id = f"sim-email-{uuid4()}"
        self._logger.info(
            f"[SIMULATION] Email sent",
            extra={'to': to, 'subject': subject, 'message_id': message_id}
        )

        return {
            'success': True,
            'provider': 'simulation',
            'message_id': message_id,
            'simulated': True
        }

    def get_provider_name(self) -> str:
        return "simulation"


class SimulatedSMSProvider(SMSProvider):
    """Simulated SMS provider for development/testing"""

    def __init__(self):
        self._logger = logging.getLogger(f"{__name__}.SimulatedSMSProvider")

    async def send_sms(
        self,
        to: str,
        message: str,
        media_urls: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        import asyncio
        await asyncio.sleep(0.3)  # Simulate network delay

        message_id = f"sim-sms-{uuid4()}"
        self._logger.info(
            f"[SIMULATION] SMS sent",
            extra={'to': to, 'message_length': len(message), 'message_id': message_id}
        )

        return {
            'success': True,
            'provider': 'simulation',
            'message_id': message_id,
            'segments': (len(message) // 160) + 1,
            'simulated': True
        }

    def get_provider_name(self) -> str:
        return "simulation"


class SimulatedPushProvider(PushProvider):
    """Simulated push provider for development/testing"""

    def __init__(self):
        self._logger = logging.getLogger(f"{__name__}.SimulatedPushProvider")

    async def send_push(
        self,
        device_tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        image_url: Optional[str] = None,
        action_url: Optional[str] = None,
        ttl: Optional[int] = None
    ) -> Dict[str, Any]:
        import asyncio
        await asyncio.sleep(0.3)  # Simulate network delay

        responses = []
        for token in device_tokens:
            responses.append({
                'token': token,
                'message_id': f"sim-push-{uuid4()}"
            })

        self._logger.info(
            f"[SIMULATION] Push notifications sent",
            extra={'device_count': len(device_tokens), 'title': title}
        )

        return {
            'success': True,
            'provider': 'simulation',
            'success_count': len(device_tokens),
            'failure_count': 0,
            'responses': responses,
            'simulated': True
        }

    def get_provider_name(self) -> str:
        return "simulation"


# ============================================
# Provider Manager
# ============================================

class ProviderManager:
    """Manages notification provider initialization and selection"""

    def __init__(self):
        self._email_provider: Optional[EmailProvider] = None
        self._sms_provider: Optional[SMSProvider] = None
        self._push_provider: Optional[PushProvider] = None
        self._logger = logging.getLogger(f"{__name__}.ProviderManager")

    def initialize(self):
        """Initialize all providers from environment configuration"""
        self._initialize_email_provider()
        self._initialize_sms_provider()
        self._initialize_push_provider()

    def _initialize_email_provider(self):
        """Initialize email provider (SendGrid preferred, then AWS SES, then simulation)"""
        # Try SendGrid first
        sendgrid_config = SendGridConfig.from_env()
        if sendgrid_config:
            self._email_provider = SendGridProvider(sendgrid_config)
            self._logger.info("Email provider initialized: SendGrid")
            return

        # Try AWS SES
        ses_config = AWSSESConfig.from_env()
        if ses_config:
            self._email_provider = AWSSESProvider(ses_config)
            self._logger.info("Email provider initialized: AWS SES")
            return

        # Fall back to simulation
        self._email_provider = SimulatedEmailProvider()
        self._logger.warning("No email provider configured - using simulation mode")

    def _initialize_sms_provider(self):
        """Initialize SMS provider (Twilio or simulation)"""
        twilio_config = TwilioConfig.from_env()
        if twilio_config:
            self._sms_provider = TwilioProvider(twilio_config)
            self._logger.info("SMS provider initialized: Twilio")
            return

        # Fall back to simulation
        self._sms_provider = SimulatedSMSProvider()
        self._logger.warning("No SMS provider configured - using simulation mode")

    def _initialize_push_provider(self):
        """Initialize push provider (FCM or simulation)"""
        fcm_config = FCMConfig.from_env()
        if fcm_config:
            self._push_provider = FCMProvider(fcm_config)
            self._logger.info("Push provider initialized: Firebase Cloud Messaging")
            return

        # Fall back to simulation
        self._push_provider = SimulatedPushProvider()
        self._logger.warning("No push provider configured - using simulation mode")

    @property
    def email_provider(self) -> EmailProvider:
        return self._email_provider

    @property
    def sms_provider(self) -> SMSProvider:
        return self._sms_provider

    @property
    def push_provider(self) -> PushProvider:
        return self._push_provider

    def get_status(self) -> Dict[str, Any]:
        """Get provider status for health checks"""
        return {
            'email': {
                'provider': self._email_provider.get_provider_name() if self._email_provider else None,
                'configured': not isinstance(self._email_provider, SimulatedEmailProvider)
            },
            'sms': {
                'provider': self._sms_provider.get_provider_name() if self._sms_provider else None,
                'configured': not isinstance(self._sms_provider, SimulatedSMSProvider)
            },
            'push': {
                'provider': self._push_provider.get_provider_name() if self._push_provider else None,
                'configured': not isinstance(self._push_provider, SimulatedPushProvider)
            }
        }


# Global provider manager instance
provider_manager = ProviderManager()

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

    # Initialize notification providers
    provider_manager.initialize()
    provider_status = provider_manager.get_status()
    logger.info(f"Provider status: {json.dumps(provider_status)}")

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
        "version": "1.0.0",
        "providers": provider_manager.get_status()
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
            "attachments_count": len(notification.attachments) if notification.attachments else 0,
            "provider": provider_manager.email_provider.get_provider_name()
        }
    }

    notifications[notification_id] = notification_record
    background_tasks.add_task(_send_email_notification, notification_id, notification)

    logger.info(f"Email notification queued: {notification_id}, to: {notification.to}, provider: {provider_manager.email_provider.get_provider_name()}")

    return {
        "success": True,
        "message": "Email notification queued successfully",
        "data": {
            "notification_id": notification_id,
            "status": NotificationStatus.QUEUED.value,
            "recipients": len(notification.to),
            "scheduled_at": notification.scheduled_at,
            "provider": provider_manager.email_provider.get_provider_name()
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
            "message_length": len(message),
            "provider": provider_manager.sms_provider.get_provider_name()
        }
    }

    notifications[notification_id] = notification_record
    background_tasks.add_task(_send_sms_notification, notification_id, notification.to, message)

    logger.info(f"SMS notification queued: {notification_id}, to: {notification.to}, provider: {provider_manager.sms_provider.get_provider_name()}")

    return {
        "success": True,
        "message": "SMS notification queued successfully",
        "data": {
            "notification_id": notification_id,
            "status": NotificationStatus.QUEUED.value,
            "message_segments": (len(message) // 160) + 1,
            "provider": provider_manager.sms_provider.get_provider_name()
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
        "error": None,
        "metadata": {
            "provider": provider_manager.push_provider.get_provider_name()
        }
    }

    notifications[notification_id] = notification_record
    background_tasks.add_task(_send_push_notification, notification_id, notification)

    logger.info(f"Push notification queued: {notification_id}, user: {notification.user_id}, provider: {provider_manager.push_provider.get_provider_name()}")

    return {
        "success": True,
        "message": "Push notification queued successfully",
        "data": {
            "notification_id": notification_id,
            "status": NotificationStatus.QUEUED.value,
            "devices": len(notification.device_tokens) if notification.device_tokens else 0,
            "provider": provider_manager.push_provider.get_provider_name()
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


async def _send_email_notification(notification_id: str, notification: EmailNotification):
    """Send email notification using configured provider."""
    if notification_id not in notifications:
        return

    n = notifications[notification_id]

    try:
        # Process template if specified
        body = notification.body
        html_body = notification.html_body
        if notification.template_id:
            template = templates.get(notification.template_id)
            if template:
                body = _process_template(template.get("body", ""), notification.template_data or {})
                html_body = _process_template(template.get("html_body", ""), notification.template_data or {})

        # Send via provider
        result = await provider_manager.email_provider.send_email(
            to=notification.to,
            subject=notification.subject,
            body=body,
            html_body=html_body,
            cc=notification.cc,
            bcc=notification.bcc,
            attachments=notification.attachments
        )

        n["sent_at"] = datetime.utcnow().isoformat()

        if result.get('success'):
            n["status"] = NotificationStatus.DELIVERED.value
            n["delivered_at"] = datetime.utcnow().isoformat()
            n["metadata"]["provider_message_id"] = result.get('message_id')
            logger.info(
                f"Email notification sent successfully: {notification_id}",
                extra={'provider': result.get('provider'), 'message_id': result.get('message_id')}
            )
        else:
            n["status"] = NotificationStatus.FAILED.value
            n["error"] = result.get('error', 'Unknown error')
            logger.error(
                f"Email notification failed: {notification_id}",
                extra={'provider': result.get('provider'), 'error': result.get('error')}
            )

    except Exception as e:
        n["status"] = NotificationStatus.FAILED.value
        n["error"] = str(e)
        logger.error(f"Email notification error: {notification_id}", exc_info=True)


async def _send_sms_notification(notification_id: str, to: str, message: str):
    """Send SMS notification using configured provider."""
    if notification_id not in notifications:
        return

    n = notifications[notification_id]

    try:
        # Send via provider
        result = await provider_manager.sms_provider.send_sms(
            to=to,
            message=message
        )

        n["sent_at"] = datetime.utcnow().isoformat()

        if result.get('success'):
            n["status"] = NotificationStatus.DELIVERED.value
            n["delivered_at"] = datetime.utcnow().isoformat()
            n["metadata"]["provider_message_id"] = result.get('message_id')
            n["metadata"]["segments"] = result.get('segments', 1)
            logger.info(
                f"SMS notification sent successfully: {notification_id}",
                extra={'provider': result.get('provider'), 'message_id': result.get('message_id')}
            )
        else:
            n["status"] = NotificationStatus.FAILED.value
            n["error"] = result.get('error', 'Unknown error')
            logger.error(
                f"SMS notification failed: {notification_id}",
                extra={'provider': result.get('provider'), 'error': result.get('error')}
            )

    except Exception as e:
        n["status"] = NotificationStatus.FAILED.value
        n["error"] = str(e)
        logger.error(f"SMS notification error: {notification_id}", exc_info=True)


async def _send_push_notification(notification_id: str, notification: PushNotification):
    """Send push notification using configured provider."""
    if notification_id not in notifications:
        return

    n = notifications[notification_id]

    # Ensure we have device tokens
    device_tokens = notification.device_tokens or []
    if not device_tokens:
        n["status"] = NotificationStatus.FAILED.value
        n["error"] = "No device tokens provided"
        logger.warning(f"Push notification skipped - no device tokens: {notification_id}")
        return

    try:
        # Send via provider
        result = await provider_manager.push_provider.send_push(
            device_tokens=device_tokens,
            title=notification.title,
            body=notification.body,
            data=notification.data,
            image_url=notification.image_url,
            action_url=notification.action_url,
            ttl=notification.ttl
        )

        n["sent_at"] = datetime.utcnow().isoformat()

        if result.get('success'):
            n["status"] = NotificationStatus.DELIVERED.value
            n["delivered_at"] = datetime.utcnow().isoformat()
            n["metadata"]["success_count"] = result.get('success_count', 0)
            n["metadata"]["failure_count"] = result.get('failure_count', 0)
            logger.info(
                f"Push notification sent successfully: {notification_id}",
                extra={
                    'provider': result.get('provider'),
                    'success_count': result.get('success_count'),
                    'failure_count': result.get('failure_count')
                }
            )
        else:
            # Partial success handling
            if result.get('success_count', 0) > 0:
                n["status"] = NotificationStatus.SENT.value
                n["metadata"]["success_count"] = result.get('success_count', 0)
                n["metadata"]["failure_count"] = result.get('failure_count', 0)
                n["error"] = f"Partial delivery: {result.get('failure_count', 0)} failed"
            else:
                n["status"] = NotificationStatus.FAILED.value
                n["error"] = result.get('error', 'Unknown error')

            logger.error(
                f"Push notification failed: {notification_id}",
                extra={'provider': result.get('provider'), 'error': result.get('error')}
            )

    except Exception as e:
        n["status"] = NotificationStatus.FAILED.value
        n["error"] = str(e)
        logger.error(f"Push notification error: {notification_id}", exc_info=True)


async def _process_bulk_notifications(batch_id: str, notification_ids: List[str]):
    """Process bulk notifications in background."""
    import asyncio

    for nid in notification_ids:
        if nid not in notifications:
            continue

        n = notifications[nid]
        n["status"] = NotificationStatus.QUEUED.value
        channel = n.get("channel")

        try:
            if channel == NotificationChannel.EMAIL.value:
                # Reconstruct email notification from stored data
                email_notification = EmailNotification(
                    to=[n.get("recipient", {}).get("email", "")] if isinstance(n.get("recipient"), dict) else [n.get("recipient", "")],
                    subject=n.get("subject", "Bulk Notification"),
                    body=n.get("body", ""),
                    template_id=n.get("template_id"),
                    template_data=n.get("template_data")
                )
                await _send_email_notification(nid, email_notification)

            elif channel == NotificationChannel.SMS.value:
                recipient = n.get("recipient", {})
                phone = recipient.get("phone", "") if isinstance(recipient, dict) else str(recipient)
                await _send_sms_notification(nid, phone, n.get("message", ""))

            elif channel == NotificationChannel.PUSH.value:
                recipient = n.get("recipient", {})
                push_notification = PushNotification(
                    user_id=recipient.get("user_id", "") if isinstance(recipient, dict) else str(recipient),
                    device_tokens=recipient.get("device_tokens", []) if isinstance(recipient, dict) else [],
                    title=n.get("title", "Notification"),
                    body=n.get("body", "")
                )
                await _send_push_notification(nid, push_notification)

            # Small delay between messages to avoid rate limiting
            await asyncio.sleep(0.1)

        except Exception as e:
            n["status"] = NotificationStatus.FAILED.value
            n["error"] = str(e)
            logger.error(f"Bulk notification failed for {nid}: {str(e)}")

    logger.info(f"Bulk notification batch {batch_id} completed")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8009"))
    uvicorn.run(app, host="0.0.0.0", port=port)
