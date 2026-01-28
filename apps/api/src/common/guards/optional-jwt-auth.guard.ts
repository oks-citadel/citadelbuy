import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

interface JwtUser {
  id: string;
  email?: string;
  role?: string;
}

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override handleRequest to make authentication optional
  handleRequest<TUser = JwtUser | null>(
    _err: unknown,
    user: TUser | false,
    _info: unknown,
    _context: ExecutionContext
  ): TUser | null {
    // If there's no error and user exists, attach user to request
    // If there's an error or no user, just return null (don't throw error)
    return user || null;
  }
}
