import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerException } from '@nestjs/throttler';

/**
 * Enhanced Throttler Guard with custom rate limiting logic
 * Provides different rate limits based on endpoint types and user authentication
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
