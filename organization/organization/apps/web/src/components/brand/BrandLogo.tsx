'use client';

import Link from 'next/link';

/**
 * BrandLogo - Unified Broxiva logo component
 *
 * CRITICAL: This component enforces logo consistency across the entire platform.
 * Use ONLY this component for logo rendering. Do not use ad-hoc img tags or custom implementations.
 *
 * Variants:
 * - default: Full logo with icon + text (140x40)
 * - compact: Icon only (40x40)
 * - mono: Monochrome version (140x40)
 * - footer: Slightly smaller for footer (120x34)
 */

type LogoVariant = 'default' | 'compact' | 'mono' | 'footer';
type LogoTheme = 'light' | 'dark' | 'auto';

interface BrandLogoProps {
  variant?: LogoVariant;
  theme?: LogoTheme;
  className?: string;
  href?: string;
  showText?: boolean;
}

const LOGO_CONFIG = {
  default: {
    iconSize: 'h-8 w-8',
    iconRadius: 'rounded-lg',
    textSize: 'text-xl',
    gap: 'gap-2',
  },
  compact: {
    iconSize: 'h-10 w-10',
    iconRadius: 'rounded-xl',
    textSize: 'text-xl',
    gap: 'gap-2',
  },
  mono: {
    iconSize: 'h-8 w-8',
    iconRadius: 'rounded-lg',
    textSize: 'text-xl',
    gap: 'gap-2',
  },
  footer: {
    iconSize: 'h-10 w-10',
    iconRadius: 'rounded-xl',
    textSize: 'text-2xl',
    gap: 'gap-3',
  },
} as const;

export function BrandLogo({
  variant = 'default',
  theme = 'auto',
  className = '',
  href = '/',
  showText = true,
}: BrandLogoProps) {
  const config = LOGO_CONFIG[variant];

  // Determine colors based on theme
  const getColors = () => {
    switch (theme) {
      case 'light':
        return {
          iconBg: 'bg-primary',
          iconText: 'text-primary-foreground',
          brandText: 'text-foreground',
        };
      case 'dark':
        return {
          iconBg: 'bg-gradient-to-br from-violet-500 to-purple-600',
          iconText: 'text-white',
          brandText: 'text-white',
          shadow: 'shadow-lg shadow-violet-500/25',
        };
      case 'auto':
      default:
        return {
          iconBg: 'bg-primary',
          iconText: 'text-primary-foreground',
          brandText: '', // Uses default foreground based on context
        };
    }
  };

  const colors = getColors();

  const LogoContent = (
    <div className={`flex items-center ${config.gap} ${className}`}>
      {/* Logo Icon - Always the letter B in a styled container */}
      <div
        className={`
          ${config.iconSize}
          ${config.iconRadius}
          ${colors.iconBg}
          ${colors.shadow || ''}
          flex items-center justify-center
          transition-transform duration-200
          group-hover:scale-105
        `}
      >
        <span className={`${colors.iconText} font-bold ${variant === 'compact' || variant === 'footer' ? 'text-xl' : 'text-lg'}`}>
          B
        </span>
      </div>

      {/* Brand Text - Conditional based on variant and showText prop */}
      {showText && variant !== 'compact' && (
        <span className={`font-bold ${config.textSize} ${colors.brandText} hidden sm:inline-block`}>
          Broxiva
        </span>
      )}
    </div>
  );

  // If href is provided, wrap in Link
  if (href) {
    return (
      <Link href={href} className="group flex items-center">
        {LogoContent}
      </Link>
    );
  }

  return LogoContent;
}

/**
 * BrandLogoFull - Logo with full branding for special contexts
 */
export function BrandLogoFull({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <BrandLogo variant="compact" showText={false} href={undefined} />
      <span className="font-bold text-2xl mt-2">Broxiva</span>
      <span className="text-sm text-muted-foreground">Premium Marketplace</span>
    </div>
  );
}

export default BrandLogo;
