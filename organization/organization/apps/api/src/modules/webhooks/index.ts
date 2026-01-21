/**
 * Webhook Module - Public Exports
 *
 * This file exports the public API of the webhook module for use by other modules.
 */

// Module
export { WebhookModule } from './webhook.module';

// Services
export { WebhookService, WEBHOOK_QUEUE } from './webhook.service';
export { WebhookEventsService } from './webhook-events.service';

// DTOs
export * from './dto';

// Utilities
export * from './utils/webhook-signature.util';

// Controller (if needed for testing)
export { WebhookController } from './webhook.controller';

// Processor (if needed for testing)
export { WebhookProcessor } from './webhook.processor';
