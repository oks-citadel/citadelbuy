/**
 * Feature Flag Constants and Types
 * Extracted to avoid circular dependencies between decorator and guard
 */

export const FEATURE_FLAG_KEY = 'feature_flag';

export interface FeatureFlagOptions {
  /**
   * What to do when flag is disabled
   * - 'throw': Throw 404 Not Found (default)
   * - 'empty': Return empty response
   * - 'fallback': Call fallback handler
   */
  onDisabled?: 'throw' | 'empty' | 'fallback';

  /**
   * Custom error message when flag is disabled
   */
  errorMessage?: string;

  /**
   * HTTP status code when flag is disabled (default: 404)
   */
  statusCode?: number;
}
