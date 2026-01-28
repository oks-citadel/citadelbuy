import { PartialType } from '@nestjs/mapped-types';
import { CreateWebhookDto } from './create-webhook.dto';

/**
 * DTO for updating a webhook
 * Uses PartialType from @nestjs/mapped-types to preserve validation decorators
 * while making all fields optional
 */
export class UpdateWebhookDto extends PartialType(CreateWebhookDto) {}
