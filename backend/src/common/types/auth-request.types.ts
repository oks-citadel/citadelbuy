import { Request } from 'express';

/**
 * Authenticated user object attached to request by JWT strategy
 */
export interface AuthUser {
  id: string;
  email: string;
  role?: 'ADMIN' | 'VENDOR' | 'CUSTOMER';
  [key: string]: any;
}

/**
 * Express Request with authenticated user
 */
export interface AuthRequest extends Request {
  user: AuthUser;
}

/**
 * Express Request with optional authenticated user (for OptionalJwtAuthGuard)
 */
export interface OptionalAuthRequest extends Request {
  user?: AuthUser;
}

/**
 * Type guard to check if request has authenticated user
 */
export function isAuthRequest(req: Request): req is AuthRequest {
  return 'user' in req && typeof (req as any).user === 'object';
}
