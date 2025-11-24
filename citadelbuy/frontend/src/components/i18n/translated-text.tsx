'use client';

import { useTranslation } from '@/contexts/i18n.context';

interface TranslatedTextProps {
  tKey: string;
  fallback?: string;
  className?: string;
}

/**
 * Simple component for displaying translated text
 * Usage: <TranslatedText tKey="common.add_to_cart" fallback="Add to Cart" />
 */
export function TranslatedText({ tKey, fallback, className }: TranslatedTextProps) {
  const t = useTranslation();
  return <span className={className}>{t(tKey, fallback)}</span>;
}
