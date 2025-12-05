/**
 * ADD THESE METHODS TO auth.service.ts
 *
 * Instructions:
 * 1. Add TokenBlacklistService to imports at top of file:
 *    import { TokenBlacklistService } from './token-blacklist.service';
 *
 * 2. Add to constructor parameters:
 *    private tokenBlacklistService: TokenBlacklistService,
 *
 * 3. Replace the existing token generation in login(), register(), socialLogin()
 *    to use this.generateToken() instead of this.jwtService.sign()
 *
 * 4. Add these methods to the AuthService class:
 */

/**
 * Generate JWT token with unique ID (jti) for blacklist tracking
 * SECURITY: jti enables us to blacklist specific tokens
 */
private generateToken(payload: any, options?: any): string {
  const tokenPayload = {
    ...payload,
    jti: crypto.randomUUID(), // Add unique token ID
  };

  return this.jwtService.sign(tokenPayload, options);
}

/**
 * Logout - Blacklist the current token
 * SECURITY: This makes the token invalid immediately, even though JWTs are stateless
 */
async logout(token: string): Promise<{ message: string }> {
  try {
    const success = await this.tokenBlacklistService.blacklistToken(token);

    if (success) {
      this.logger.log('User logged out successfully, token blacklisted');
      return { message: 'Logged out successfully' };
    } else {
      this.logger.warn('Token blacklist failed during logout');
      // Still return success to user - they've done their part
      return { message: 'Logged out successfully' };
    }
  } catch (error) {
    this.logger.error('Error during logout:', error);
    // Don't fail the logout request
    return { message: 'Logged out successfully' };
  }
}

/**
 * Invalidate all tokens for a user
 * Use cases: password change, security breach, admin action
 */
async invalidateAllUserTokens(userId: string): Promise<boolean> {
  try {
    const success = await this.tokenBlacklistService.invalidateAllUserTokens(userId);

    if (success) {
      this.logger.log(`All tokens invalidated for user ${userId}`);
    }

    return success;
  } catch (error) {
    this.logger.error(`Error invalidating tokens for user ${userId}:`, error);
    return false;
  }
}

/**
 * UPDATE THE refreshToken METHOD to check blacklist:
 * Add this at the beginning of the refreshToken() method:
 */
// Check if refresh token is blacklisted
const isBlacklisted = await this.tokenBlacklistService.isTokenBlacklisted(refreshToken);
if (isBlacklisted) {
  throw new UnauthorizedException('Refresh token has been revoked');
}

/**
 * UPDATE THE resetPassword METHOD to invalidate tokens:
 * Add this before the final return statement in resetPassword():
 */
// SECURITY: Invalidate all existing tokens when password changes
await this.invalidateAllUserTokens(user.id);
this.logger.log(`Password reset complete for user ${user.id}. All tokens invalidated.`);

/**
 * CHANGES TO EXISTING METHODS:
 *
 * In register() method, change:
 *   access_token: this.jwtService.sign({ sub: user.id, email: user.email, role: user.role }),
 * To:
 *   access_token: this.generateToken({ sub: user.id, email: user.email, role: user.role }),
 *
 * In login() method, change:
 *   access_token: this.jwtService.sign(payload),
 *   refresh_token: this.jwtService.sign(refreshPayload, {...}),
 * To:
 *   access_token: this.generateToken(payload),
 *   refresh_token: this.generateToken(refreshPayload, {...}),
 *
 * In socialLogin() method, change:
 *   access_token: this.jwtService.sign(payload),
 *   refresh_token: this.jwtService.sign(refreshPayload, {...}),
 * To:
 *   access_token: this.generateToken(payload),
 *   refresh_token: this.generateToken(refreshPayload, {...}),
 */
