/**
 * reCAPTCHA Module Exports
 *
 * This module provides comprehensive bot protection via Google reCAPTCHA v2/v3.
 *
 * Quick Start:
 *
 * 1. Import the module:
 * ```typescript
 * import { RecaptchaModule } from './common/recaptcha';
 *
 * @Module({
 *   imports: [RecaptchaModule],
 * })
 * export class AppModule {}
 * ```
 *
 * 2. Protect a route:
 * ```typescript
 * import { Recaptcha, RecaptchaGuard, RecaptchaAction } from './common/recaptcha';
 *
 * @UseGuards(RecaptchaGuard)
 * @Recaptcha({ action: RecaptchaAction.LOGIN })
 * @Post('login')
 * async login(@Body() dto: LoginDto) { ... }
 * ```
 *
 * 3. Configure environment variables:
 * ```
 * RECAPTCHA_SITE_KEY=your_site_key
 * RECAPTCHA_SECRET_KEY=your_secret_key
 * RECAPTCHA_SCORE_THRESHOLD=0.5
 * ```
 */

// Module
export { RecaptchaModule } from './recaptcha.module';

// Service
export { RecaptchaService } from './recaptcha.service';

// Guard and Decorators
export {
  RecaptchaGuard,
  Recaptcha,
  SkipRecaptcha,
  RecaptchaOptions,
  RECAPTCHA_KEY,
  SKIP_RECAPTCHA_KEY,
  isRecaptchaVerified,
  getRecaptchaScore,
} from './recaptcha.guard';

// DTOs and Types
export {
  RecaptchaTokenDto,
  RecaptchaAction,
  RecaptchaVersion,
  GoogleRecaptchaResponse,
  RecaptchaVerificationResult,
  RecaptchaConfig,
  RecaptchaLogEntry,
} from './recaptcha.dto';
