/**
 * Feature Flag Guard
 *
 * Protects routes based on feature flag evaluation.
 * Extracts user context from request to enable targeting.
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  NotFoundException,
  HttpException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagsService } from './feature-flags.service';
import { FEATURE_FLAG_KEY, FeatureFlagOptions } from './feature-flag.constants';
import { FlagContext } from './feature-flags.interface';

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const flagMetadata = this.reflector.getAllAndOverride<{
      flagKey: string;
      options?: FeatureFlagOptions;
      requiredVariant?: string;
    }>(FEATURE_FLAG_KEY, [context.getHandler(), context.getClass()]);

    // No feature flag metadata - allow access
    if (!flagMetadata) {
      return true;
    }

    const { flagKey, options, requiredVariant } = flagMetadata;
    const request = context.switchToHttp().getRequest();
    const flagContext = this.extractContext(request);

    // Evaluate the feature flag
    const evaluation = await this.featureFlagsService.evaluate(
      flagKey,
      flagContext,
    );

    // Check if flag is enabled
    if (!evaluation.enabled) {
      return this.handleDisabled(flagKey, options);
    }

    // Check for required variant (A/B testing)
    if (requiredVariant && evaluation.variant !== requiredVariant) {
      return this.handleDisabled(flagKey, options);
    }

    // Attach evaluation to request for later use
    request.featureFlagEvaluation = evaluation;

    return true;
  }

  /**
   * Extract user context from request for flag evaluation
   */
  private extractContext(request: any): FlagContext {
    const user = request.user;
    const sessionId = request.session?.id || request.cookies?.sessionId;

    const context: FlagContext = {
      sessionId,
    };

    if (user) {
      context.userId = user.id;
      context.email = user.email;
      context.role = user.role;
      context.organizationId = user.organizationId;
      context.vendorId = user.vendorId;
    }

    // Extract country from request headers or IP
    const country =
      request.headers['cf-ipcountry'] || // Cloudflare
      request.headers['x-country-code'] ||
      this.getCountryFromIP(request.ip);

    if (country) {
      context.country = country;
    }

    // Add custom context from request
    if (request.featureFlagContext) {
      context.custom = request.featureFlagContext;
    }

    return context;
  }

  /**
   * Handle when feature flag is disabled
   */
  private handleDisabled(
    flagKey: string,
    options?: FeatureFlagOptions,
  ): boolean {
    const behavior = options?.onDisabled || 'throw';
    const statusCode = options?.statusCode || 404;
    const message =
      options?.errorMessage || `Feature not available: ${flagKey}`;

    switch (behavior) {
      case 'throw':
        throw new HttpException(message, statusCode);

      case 'empty':
        // Return true but handler should check for disabled flag
        return true;

      case 'fallback':
        // Allow access, handler should use fallback method
        return true;

      default:
        throw new NotFoundException(message);
    }
  }

  /**
   * Get country code from IP address
   * This is a placeholder - implement with actual geo-IP service
   */
  private getCountryFromIP(_ip: string): string | null {
    // TODO: Integrate with MaxMind or similar geo-IP service
    return null;
  }
}
