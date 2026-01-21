import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerException } from '@nestjs/throttler';

/**
 * Enhanced Throttler Guard with custom rate limiting logic
 * Provides different rate limits based on endpoint types and user authentication
 *
 * @deprecated Use TieredThrottlerGuard from './common/throttler' for comprehensive rate limiting
 * This guard is kept for backward compatibility with existing code.
 *
 * Migration guide:
 * ```typescript
 * // Old way
 * @UseGuards(EnhancedThrottlerGuard)
 *
 * // New way - no guard needed, TieredThrottlerGuard is global
 * // Just use decorators for customization:
 * @ThrottleGroup(EndpointGroup.AUTH)
 * @ThrottleOperation(OperationType.WRITE)
 * ```
 */
@Injectable()
export class EnhancedThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use user ID for authenticated requests, IP for anonymous
    if (req.user?.id) {
      return `user-${req.user.id}`;
    }
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }

  protected errorMessage = 'Rate limit exceeded. Please try again later.';

  protected async throwThrottlingException(context: ExecutionContext): Promise<void> {
    const request = context.switchToHttp().getRequest();
    const tracker = await this.getTracker(request);

    throw new ThrottlerException(
      `Rate limit exceeded for ${tracker}. Please try again later.`
    );
  }
}
