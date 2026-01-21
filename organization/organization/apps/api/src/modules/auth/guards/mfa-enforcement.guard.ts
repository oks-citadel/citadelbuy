import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MfaEnforcementService } from '../mfa-enforcement.service';
import { MFA_ENFORCEMENT } from '../../../common/constants';

/**
 * Decorator key to skip MFA enforcement on specific routes
 * Use @SkipMfaEnforcement() decorator on routes that should be accessible
 * even without MFA (like the MFA setup route itself)
 */
export const SKIP_MFA_ENFORCEMENT_KEY = 'skipMfaEnforcement';

/**
 * MFA Enforcement Guard
 *
 * This guard checks if the authenticated user has MFA enabled when their role
 * requires it. It allows access if:
 * 1. The user's role doesn't require MFA
 * 2. The user has MFA enabled
 * 3. The user is within their grace period
 *
 * It blocks access if:
 * - The user's role requires MFA, MFA is not enabled, and grace period has expired
 *
 * Usage:
 * 1. Apply globally to all authenticated routes, or
 * 2. Apply to specific controllers/routes that need MFA enforcement
 *
 * To skip MFA enforcement on specific routes (like MFA setup), use:
 * @SkipMfaEnforcement()
 *
 * Example:
 * ```typescript
 * @Controller('admin')
 * @UseGuards(JwtAuthGuard, MfaEnforcementGuard)
 * export class AdminController {
 *   // All routes require MFA for admin role
 *
 *   @SkipMfaEnforcement()
 *   @Get('mfa-status')
 *   getMfaStatus() {
 *     // This route is accessible even without MFA
 *   }
 * }
 * ```
 */
@Injectable()
export class MfaEnforcementGuard implements CanActivate {
  private readonly logger = new Logger(MfaEnforcementGuard.name);

  constructor(
    private reflector: Reflector,
    private mfaEnforcementService: MfaEnforcementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if MFA enforcement should be skipped for this route
    const skipMfaEnforcement = this.reflector.getAllAndOverride<boolean>(
      SKIP_MFA_ENFORCEMENT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipMfaEnforcement) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If no user, let other guards handle authentication
    if (!user) {
      return true;
    }

    // Check if user can access protected resources
    const accessCheck = await this.mfaEnforcementService.canAccessProtectedResource(
      user.id,
      user.role,
    );

    if (!accessCheck.allowed) {
      this.logger.warn(
        `MFA enforcement blocked access for user ${user.id} (${user.role}): ${accessCheck.reason}`,
      );

      // Throw a detailed exception with error code for frontend handling
      throw new MfaRequiredException(
        accessCheck.reason || 'MFA setup required',
        accessCheck.errorCode || MFA_ENFORCEMENT.ERROR_CODES.MFA_SETUP_REQUIRED,
      );
    }

    // Optionally add MFA status to response headers for frontend awareness
    const response = context.switchToHttp().getResponse();
    if (response && this.mfaEnforcementService.roleRequiresMfa(user.role)) {
      const mfaStatus = await this.mfaEnforcementService.checkMfaStatus(user.id);
      if (mfaStatus.actionRequired !== 'none') {
        response.setHeader('X-MFA-Action-Required', mfaStatus.actionRequired);
        if (mfaStatus.gracePeriodDaysRemaining > 0) {
          response.setHeader('X-MFA-Grace-Period-Days', mfaStatus.gracePeriodDaysRemaining.toString());
        }
      }
    }

    return true;
  }
}

/**
 * Custom exception for MFA enforcement failures
 * Includes error code for frontend handling
 */
export class MfaRequiredException extends ForbiddenException {
  constructor(
    message: string,
    public readonly errorCode: string,
  ) {
    super({
      statusCode: 403,
      error: 'Forbidden',
      message,
      errorCode,
      mfaRequired: true,
    });
  }
}

/**
 * Decorator to skip MFA enforcement on specific routes
 *
 * Usage:
 * ```typescript
 * @SkipMfaEnforcement()
 * @Get('mfa/setup')
 * setupMfa() {
 *   // This route is accessible without MFA
 * }
 * ```
 */
import { SetMetadata } from '@nestjs/common';

export const SkipMfaEnforcement = () => SetMetadata(SKIP_MFA_ENFORCEMENT_KEY, true);
