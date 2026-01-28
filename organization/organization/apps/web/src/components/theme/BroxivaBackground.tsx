'use client';

import { ReactNode } from 'react';

interface BroxivaBackgroundProps {
  children: ReactNode;
  variant?: 'default' | 'hero' | 'minimal';
  className?: string;
}

/**
 * BroxivaBackground - Premium dark atmospheric background system
 *
 * Implements the layered gradient system from the Broxiva Design System:
 * - Base layer: Near-black (#0D0D0D → #1A1A2E)
 * - Pink radial glow (top-left)
 * - Cyan radial glow (bottom-right)
 * - Violet center mist
 *
 * @param variant - 'default' | 'hero' | 'minimal'
 * @param children - Content to render on top of the background
 */
export function BroxivaBackground({
  children,
  variant = 'default',
  className = ''
}: BroxivaBackgroundProps) {
  return (
    <div className={`relative min-h-screen ${className}`}>
      {/* Layer 0: Base gradient (near-black, NOT pure black) */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: 'linear-gradient(180deg, var(--bx-bg-0) 0%, var(--bx-bg-1) 100%)'
        }}
      />

      {variant !== 'minimal' && (
        <>
          {/* Layer 1: Pink radial glow (top-left) - Brand warmth */}
          <div
            className="fixed inset-0 -z-10 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 20% 30%, rgba(236,72,153,0.15) 0%, transparent 50%)'
            }}
          />

          {/* Layer 2: Cyan radial glow (bottom-right) - Balance accent */}
          <div
            className="fixed inset-0 -z-10 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 80% 70%, rgba(6,182,212,0.12) 0%, transparent 50%)'
            }}
          />

          {/* Layer 3: Violet center mist - Depth */}
          <div
            className="fixed inset-0 -z-10 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at 50% 50%, rgba(139,92,246,0.08) 0%, transparent 60%)'
            }}
          />
        </>
      )}

      {variant === 'hero' && (
        /* Extra aurora effect for hero sections */
        <div
          className="fixed inset-0 -z-10 pointer-events-none opacity-30"
          style={{
            background: 'linear-gradient(135deg, rgba(236,72,153,0.1) 0%, rgba(139,92,246,0.1) 50%, rgba(6,182,212,0.1) 100%)'
          }}
        />
      )}

      {/* Content layer */}
      <div className="relative z-0">
        {children}
      </div>
    </div>
  );
}

/**
 * BroxivaCard - Glass morphism card for elevated content
 */
export function BroxivaCard({
  children,
  className = '',
  glow = false
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div
      className={`
        relative rounded-bx-card p-6
        backdrop-blur-xl
        border border-[var(--bx-border)]
        shadow-bx-card
        ${glow ? 'shadow-bx-glow-violet' : ''}
        ${className}
      `}
      style={{
        background: 'rgba(31,31,46,0.8)'
      }}
    >
      {children}
    </div>
  );
}

/**
 * BroxivaNav - Navigation bar with proper brightness for readability
 */
export function BroxivaNav({
  children,
  className = ''
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <nav
      className={`
        sticky top-0 z-50
        backdrop-blur-xl
        border-b border-[var(--bx-border)]
        ${className}
      `}
      style={{
        background: 'rgba(26,26,46,0.95)'
      }}
    >
      {children}
    </nav>
  );
}

export default BroxivaBackground;
