/**
 * Application-wide constants
 * Centralized location for all constants used across the backend
 */

// MFA Enforcement Configuration
// Roles that require mandatory MFA
export const MFA_ENFORCEMENT = {
  // Roles that require MFA to be enabled
  REQUIRED_ROLES: ['ADMIN', 'VENDOR'] as const,
  // Grace period in days for new users to set up MFA
  GRACE_PERIOD_DAYS: 7,
  // Grace period in milliseconds (7 days)
  GRACE_PERIOD_MS: 7 * 24 * 60 * 60 * 1000,
  // Error codes for MFA enforcement
  ERROR_CODES: {
    MFA_REQUIRED: 'MFA_REQUIRED',
    MFA_SETUP_REQUIRED: 'MFA_SETUP_REQUIRED',
    MFA_GRACE_PERIOD_EXPIRED: 'MFA_GRACE_PERIOD_EXPIRED',
  },
} as const;
