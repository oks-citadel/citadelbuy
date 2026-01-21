import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to skip CSRF protection for specific routes
 * Use for routes that don't need CSRF protection (e.g., webhooks, public APIs)
 *
 * @example
 * @Post('webhook')
 * @SkipCsrf()
 * handleWebhook() { ... }
 */
export const SkipCsrf = () => SetMetadata('skipCsrf', true);
