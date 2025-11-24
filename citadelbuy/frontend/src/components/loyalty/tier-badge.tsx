'use client';

import { LoyaltyTier } from '@/lib/api/loyalty';
import { cn } from '@/lib/utils';

interface TierBadgeProps {
  tier: LoyaltyTier;
  icon?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const TIER_CONFIG = {
  [LoyaltyTier.BRONZE]: {
    label: 'Bronze',
    icon: '🥉',
    color: 'from-amber-700 to-amber-900',
    textColor: 'text-amber-900',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
  },
  [LoyaltyTier.SILVER]: {
    label: 'Silver',
    icon: '🥈',
    color: 'from-gray-400 to-gray-600',
    textColor: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
  },
  [LoyaltyTier.GOLD]: {
    label: 'Gold',
    icon: '🥇',
    color: 'from-yellow-400 to-yellow-600',
    textColor: 'text-yellow-900',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-400',
  },
  [LoyaltyTier.PLATINUM]: {
    label: 'Platinum',
    icon: '💎',
    color: 'from-purple-400 to-purple-600',
    textColor: 'text-purple-900',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-400',
  },
  [LoyaltyTier.DIAMOND]: {
    label: 'Diamond',
    icon: '💠',
    color: 'from-cyan-400 to-blue-600',
    textColor: 'text-cyan-900',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-400',
  },
};

const SIZE_CONFIG = {
  sm: {
    badge: 'px-2 py-1 text-xs',
    icon: 'text-sm',
  },
  md: {
    badge: 'px-3 py-1.5 text-sm',
    icon: 'text-base',
  },
  lg: {
    badge: 'px-4 py-2 text-base',
    icon: 'text-lg',
  },
};

export function TierBadge({
  tier,
  icon,
  size = 'md',
  showLabel = true,
  className,
}: TierBadgeProps) {
  const config = TIER_CONFIG[tier];
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-semibold',
        config.bgColor,
        config.borderColor,
        config.textColor,
        sizeConfig.badge,
        className
      )}
    >
      <span className={sizeConfig.icon}>{icon || config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </div>
  );
}
