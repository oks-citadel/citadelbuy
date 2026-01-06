import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { RecaptchaService } from './recaptcha.service';
import { RecaptchaGuard } from './recaptcha.guard';

/**
 * reCAPTCHA Module
 *
 * Provides bot protection via Google reCAPTCHA v2/v3 verification.
 *
 * Features:
 * - RecaptchaService: Token verification, caching, and logging
 * - RecaptchaGuard: Route protection via decorator
 * - Support for both reCAPTCHA v2 (checkbox/invisible) and v3 (score-based)
 *
 * Usage:
 *
 * 1. Import the module in your AppModule:
 * ```typescript
 * @Module({
 *   imports: [RecaptchaModule],
 * })
 * export class AppModule {}
 * ```
 *
 * 2. Use the guard on routes:
 * ```typescript
 * import { Recaptcha, RecaptchaGuard } from './common/recaptcha';
 *
 * @UseGuards(RecaptchaGuard)
 * @Recaptcha({ action: RecaptchaAction.LOGIN })
 * @Post('login')
 * async login(@Body() dto: LoginDto) {
 *   // ...
 * }
 * ```
 *
 * 3. Or apply globally:
 * ```typescript
 * @Module({
 *   providers: [
 *     {
 *       provide: APP_GUARD,
 *       useClass: RecaptchaGuard,
 *     },
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * Environment Variables:
 * - RECAPTCHA_SITE_KEY: Public site key (for frontend)
 * - RECAPTCHA_SECRET_KEY: Secret key (for server verification)
 * - RECAPTCHA_SCORE_THRESHOLD: Minimum score for v3 (0.0-1.0, default 0.5)
 * - RECAPTCHA_ENABLED: Enable/disable verification (default true)
 * - RECAPTCHA_EXEMPT_IPS: Comma-separated exempt IPs
 * - RECAPTCHA_CACHE_TTL: Cache TTL in seconds (default 300)
 */
@Global()
@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 3,
    }),
    ConfigModule,
  ],
  providers: [RecaptchaService, RecaptchaGuard],
  exports: [RecaptchaService, RecaptchaGuard],
})
export class RecaptchaModule {}
