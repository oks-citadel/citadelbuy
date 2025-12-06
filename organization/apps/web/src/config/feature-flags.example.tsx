/**
 * Feature Flags Usage Examples
 *
 * This file demonstrates various ways to use the feature flags system
 * in your React components and application code.
 */

'use client';

import React from 'react';
import { FeatureFlag, isFeatureEnabled } from '@/config/feature-flags';
import { useFeatureFlag, useFeatureFlags, useEnabledFeatures } from '@/hooks/useFeatureFlag';
import {
  FeatureFlag as FeatureFlagComponent,
  FeatureFlags as FeatureFlagsComponent,
  withFeatureFlag,
  FeatureFlagDebug,
  FeatureFlagDashboard,
} from '@/components/feature-flag';

// ============================================================================
// EXAMPLE 1: Using the hook directly
// ============================================================================

export function AIRecommendationsExample() {
  const { isEnabled, isLoading, config } = useFeatureFlag(FeatureFlag.AI_RECOMMENDATIONS);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isEnabled) {
    return <div>AI Recommendations are not available yet</div>;
  }

  return (
    <div>
      <h2>AI Recommendations</h2>
      <p>{config?.description}</p>
      {/* Your AI recommendations component here */}
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: Using the declarative component wrapper
// ============================================================================

export function SocialLoginExample() {
  return (
    <FeatureFlagComponent flag={FeatureFlag.SOCIAL_LOGIN}>
      <div>
        <button>Login with Google</button>
        <button>Login with Facebook</button>
        <button>Login with Apple</button>
      </div>
    </FeatureFlagComponent>
  );
}

// ============================================================================
// EXAMPLE 3: With fallback content
// ============================================================================

export function BNPLPaymentsExample() {
  return (
    <FeatureFlagComponent
      flag={FeatureFlag.BNPL_PAYMENTS}
      fallback={
        <div>
          <p>Traditional payment methods only</p>
          <button>Pay with Credit Card</button>
        </div>
      }
    >
      <div>
        <p>Choose your payment method:</p>
        <button>Pay with Klarna</button>
        <button>Pay with Afterpay</button>
        <button>Pay with Credit Card</button>
      </div>
    </FeatureFlagComponent>
  );
}

// ============================================================================
// EXAMPLE 4: With user targeting
// ============================================================================

export function VirtualTryOnExample({ userId }: { userId: string }) {
  return (
    <FeatureFlagComponent
      flag={FeatureFlag.VIRTUAL_TRYON}
      userId={userId}
      fallback={<div>Standard product images</div>}
    >
      <div>
        <h3>Try it on virtually!</h3>
        <button>Launch AR View</button>
      </div>
    </FeatureFlagComponent>
  );
}

// ============================================================================
// EXAMPLE 5: Using render prop for conditional logic
// ============================================================================

export function ChatSupportExample() {
  return (
    <FeatureFlagComponent
      flag={FeatureFlag.CHAT_SUPPORT}
      render={(enabled) => (
        <div className="support-section">
          <h3>Need Help?</h3>
          {enabled ? (
            <div>
              <button>Start Live Chat</button>
              <p>Our agents are available 24/7</p>
            </div>
          ) : (
            <div>
              <button>Send Email</button>
              <p>We'll respond within 24 hours</p>
            </div>
          )}
        </div>
      )}
    />
  );
}

// ============================================================================
// EXAMPLE 6: Checking multiple flags
// ============================================================================

export function MultipleFeatureExample() {
  const features = useFeatureFlags([
    FeatureFlag.AI_RECOMMENDATIONS,
    FeatureFlag.SOCIAL_LOGIN,
    FeatureFlag.CHAT_SUPPORT,
  ]);

  return (
    <div>
      <h2>Available Features</h2>
      <ul>
        {features[FeatureFlag.AI_RECOMMENDATIONS] && (
          <li>Personalized AI Recommendations</li>
        )}
        {features[FeatureFlag.SOCIAL_LOGIN] && (
          <li>Social Login Options</li>
        )}
        {features[FeatureFlag.CHAT_SUPPORT] && (
          <li>Live Chat Support</li>
        )}
      </ul>
    </div>
  );
}

// ============================================================================
// EXAMPLE 7: Using FeatureFlags component with "all" mode
// ============================================================================

export function PremiumFeaturesExample() {
  return (
    <FeatureFlagsComponent
      flags={[FeatureFlag.AI_RECOMMENDATIONS, FeatureFlag.VIRTUAL_TRYON]}
      mode="all"
      fallback={<div>Premium features require both AI and AR capabilities</div>}
    >
      <div>
        <h2>Premium Experience</h2>
        <p>AI-powered recommendations with virtual try-on!</p>
      </div>
    </FeatureFlagsComponent>
  );
}

// ============================================================================
// EXAMPLE 8: Using FeatureFlags component with "any" mode
// ============================================================================

export function PaymentOptionsExample() {
  return (
    <FeatureFlagsComponent
      flags={[FeatureFlag.BNPL_PAYMENTS, FeatureFlag.OFFLINE_MODE]}
      mode="any"
      fallback={<div>Standard payment only</div>}
    >
      <div>
        <h3>Flexible Payment Options</h3>
        <p>We support various payment methods!</p>
      </div>
    </FeatureFlagsComponent>
  );
}

// ============================================================================
// EXAMPLE 9: Using Higher-Order Component (HOC)
// ============================================================================

function ExpensiveAIComponent() {
  return (
    <div>
      <h2>Advanced AI Features</h2>
      <p>This component only loads when the feature is enabled</p>
    </div>
  );
}

export const AIComponentWithFlag = withFeatureFlag(
  ExpensiveAIComponent,
  FeatureFlag.AI_RECOMMENDATIONS,
  {
    fallback: <div>AI features coming soon!</div>,
    loading: <div>Loading AI features...</div>,
  }
);

// ============================================================================
// EXAMPLE 10: Using feature flags in utility functions
// ============================================================================

export function getAvailablePaymentMethods() {
  const methods = ['credit_card', 'debit_card'];

  if (isFeatureEnabled(FeatureFlag.BNPL_PAYMENTS)) {
    methods.push('klarna', 'afterpay');
  }

  return methods;
}

// ============================================================================
// EXAMPLE 11: Using callback for analytics
// ============================================================================

export function AnalyticsExample() {
  const { isEnabled } = useFeatureFlag(FeatureFlag.AI_RECOMMENDATIONS, {
    onToggle: (enabled) => {
      // Track feature flag state in analytics
      console.log('AI Recommendations feature:', enabled ? 'enabled' : 'disabled');
      // analytics.track('feature_flag_checked', {
      //   flag: 'AI_RECOMMENDATIONS',
      //   enabled,
      // });
    },
  });

  return <div>AI Features: {isEnabled ? 'Active' : 'Inactive'}</div>;
}

// ============================================================================
// EXAMPLE 12: Debug component (development only)
// ============================================================================

export function DebugExample() {
  return (
    <div>
      {process.env.NODE_ENV === 'development' && (
        <FeatureFlagDebug flag={FeatureFlag.AI_RECOMMENDATIONS} />
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE 13: Feature flags dashboard (admin panel)
// ============================================================================

export function AdminPanelExample() {
  return (
    <div>
      <h1>Admin Panel</h1>
      <FeatureFlagDashboard />
    </div>
  );
}

// ============================================================================
// EXAMPLE 14: Getting all enabled features
// ============================================================================

export function EnabledFeaturesListExample() {
  const enabledFeatures = useEnabledFeatures();

  return (
    <div>
      <h3>Currently Enabled Features:</h3>
      <ul>
        {enabledFeatures.map((feature) => (
          <li key={feature}>{feature}</li>
        ))}
      </ul>
      {enabledFeatures.length === 0 && <p>No features enabled</p>}
    </div>
  );
}

// ============================================================================
// EXAMPLE 15: Conditional navigation based on features
// ============================================================================

export function NavigationExample() {
  const features = useFeatureFlags([
    FeatureFlag.AI_RECOMMENDATIONS,
    FeatureFlag.VIRTUAL_TRYON,
    FeatureFlag.CHAT_SUPPORT,
  ]);

  return (
    <nav>
      <a href="/">Home</a>
      <a href="/products">Products</a>
      {features[FeatureFlag.AI_RECOMMENDATIONS] && (
        <a href="/recommendations">For You</a>
      )}
      {features[FeatureFlag.VIRTUAL_TRYON] && (
        <a href="/ar-tryron">Virtual Try-On</a>
      )}
      {features[FeatureFlag.CHAT_SUPPORT] && (
        <a href="/support">Live Support</a>
      )}
    </nav>
  );
}

// ============================================================================
// EXAMPLE 16: Progressive feature rollout with user targeting
// ============================================================================

export function BetaFeatureExample({ user }: { user: { id: string; email: string } }) {
  return (
    <FeatureFlagComponent
      flag={FeatureFlag.VIRTUAL_TRYON}
      userId={user.id}
      fallback={
        <div>
          <p>Want early access to Virtual Try-On?</p>
          <button>Join Beta Program</button>
        </div>
      }
    >
      <div>
        <h3>Beta Feature: Virtual Try-On</h3>
        <p>You have early access to this feature!</p>
        <button>Try it now</button>
      </div>
    </FeatureFlagComponent>
  );
}

// ============================================================================
// EXAMPLE 17: Complex conditional rendering
// ============================================================================

export function ProductPageExample({ userId }: { userId?: string }) {
  return (
    <div className="product-page">
      <h1>Product Details</h1>

      {/* Always visible */}
      <div className="product-images">Product images here</div>

      {/* Conditional AI recommendations */}
      <FeatureFlagComponent flag={FeatureFlag.AI_RECOMMENDATIONS} userId={userId}>
        <div className="ai-recommendations">
          <h3>You might also like</h3>
          {/* AI recommendation component */}
        </div>
      </FeatureFlagComponent>

      {/* Conditional virtual try-on */}
      <FeatureFlagComponent flag={FeatureFlag.VIRTUAL_TRYON} userId={userId}>
        <button className="ar-button">Try it on in AR</button>
      </FeatureFlagComponent>

      {/* Conditional payment options */}
      <div className="checkout-section">
        <h3>Payment Options</h3>
        <button>Pay Now</button>
        <FeatureFlagComponent flag={FeatureFlag.BNPL_PAYMENTS}>
          <button>Pay in Installments</button>
        </FeatureFlagComponent>
      </div>

      {/* Conditional support */}
      <FeatureFlagComponent
        flag={FeatureFlag.CHAT_SUPPORT}
        fallback={
          <a href="/contact">Contact Support</a>
        }
      >
        <button>Chat with Us</button>
      </FeatureFlagComponent>
    </div>
  );
}
