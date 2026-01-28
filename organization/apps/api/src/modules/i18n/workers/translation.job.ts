/**
 * Translation Job Definitions
 * Defines the job data structures and types for translation workers
 */

import { TRANSLATION_STATUS, TranslationStatus } from '@/common/queue/queue.constants';

/**
 * Supported LLM providers for translation
 */
export enum TranslationProvider {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  GOOGLE = 'google',
  AZURE = 'azure',
  /** Fallback mock provider for development */
  MOCK = 'mock',
}

/**
 * Content type to translate
 */
export enum TranslationContentType {
  PRODUCT_TITLE = 'product_title',
  PRODUCT_DESCRIPTION = 'product_description',
  PRODUCT_FEATURES = 'product_features',
  CATEGORY_NAME = 'category_name',
  CATEGORY_DESCRIPTION = 'category_description',
  PAGE_CONTENT = 'page_content',
  EMAIL_TEMPLATE = 'email_template',
  UI_STRING = 'ui_string',
}

/**
 * Base translation job data
 */
export interface TranslationJobData {
  /** Unique ID for the translation job */
  jobId: string;
  /** Tenant ID */
  tenantId: string;
  /** Organization ID */
  organizationId?: string;
  /** Source locale (e.g., 'en') */
  sourceLocale: string;
  /** Target locale (e.g., 'fr') */
  targetLocale: string;
  /** Content to translate */
  content: TranslationContent;
  /** LLM provider to use */
  provider?: TranslationProvider;
  /** Whether to preserve HTML/markdown formatting */
  preserveFormatting?: boolean;
  /** Custom translation context/instructions */
  context?: string;
  /** Priority */
  priority?: 'high' | 'normal' | 'low';
  /** Correlation ID for tracing */
  correlationId?: string;
  /** User who triggered the translation */
  triggeredBy?: string;
  /** Timestamp when triggered */
  triggeredAt?: string;
}

/**
 * Content to be translated
 */
export interface TranslationContent {
  /** Content type */
  type: TranslationContentType;
  /** Entity ID (product ID, category ID, etc.) */
  entityId: string;
  /** Field name within the entity */
  fieldName: string;
  /** Source text to translate */
  sourceText: string;
  /** Maximum output length (optional) */
  maxLength?: number;
  /** Tone/style preference */
  tone?: 'formal' | 'casual' | 'professional' | 'friendly';
  /** Industry-specific terminology hints */
  terminology?: Record<string, string>;
}

/**
 * Batch translation job data
 */
export interface BatchTranslationJobData {
  /** Unique batch ID */
  batchId: string;
  /** Tenant ID */
  tenantId: string;
  /** Source locale */
  sourceLocale: string;
  /** Target locales */
  targetLocales: string[];
  /** Content items to translate */
  items: TranslationContent[];
  /** LLM provider */
  provider?: TranslationProvider;
  /** Preserve formatting */
  preserveFormatting?: boolean;
  /** Translation context */
  context?: string;
  /** Triggered by */
  triggeredBy?: string;
}

/**
 * Translation job result
 */
export interface TranslationJobResult {
  /** Success status */
  success: boolean;
  /** Job ID */
  jobId: string;
  /** Entity ID */
  entityId: string;
  /** Source locale */
  sourceLocale: string;
  /** Target locale */
  targetLocale: string;
  /** Translated text */
  translatedText?: string;
  /** Translation status */
  status: TranslationStatus;
  /** Provider used */
  provider: TranslationProvider;
  /** Quality score (0-100) */
  qualityScore?: number;
  /** Duration in milliseconds */
  durationMs: number;
  /** Tokens used (for cost tracking) */
  tokensUsed?: {
    input: number;
    output: number;
  };
  /** Error message if failed */
  error?: string;
  /** Warnings (e.g., formatting issues) */
  warnings?: string[];
}

/**
 * Batch translation result
 */
export interface BatchTranslationResult {
  /** Batch ID */
  batchId: string;
  /** Total items */
  totalItems: number;
  /** Successfully translated */
  successCount: number;
  /** Failed translations */
  failureCount: number;
  /** Individual results */
  results: TranslationJobResult[];
  /** Total duration */
  durationMs: number;
}

/**
 * Translation job names
 */
export const TRANSLATION_JOB_NAMES = {
  TRANSLATE_SINGLE: 'translate-single',
  TRANSLATE_BATCH: 'translate-batch',
  TRANSLATE_PRODUCT: 'translate-product',
  TRANSLATE_CATEGORY: 'translate-category',
  SYNC_TRANSLATIONS: 'sync-translations',
  CLEANUP_STALE: 'cleanup-stale',
} as const;

/**
 * Supported locales with their display names
 */
export const SUPPORTED_LOCALES: Record<string, { name: string; nativeName: string }> = {
  en: { name: 'English', nativeName: 'English' },
  es: { name: 'Spanish', nativeName: 'Espa\u00f1ol' },
  fr: { name: 'French', nativeName: 'Fran\u00e7ais' },
  de: { name: 'German', nativeName: 'Deutsch' },
  it: { name: 'Italian', nativeName: 'Italiano' },
  pt: { name: 'Portuguese', nativeName: 'Portugu\u00eas' },
  nl: { name: 'Dutch', nativeName: 'Nederlands' },
  pl: { name: 'Polish', nativeName: 'Polski' },
  ru: { name: 'Russian', nativeName: '\u0420\u0443\u0441\u0441\u043a\u0438\u0439' },
  zh: { name: 'Chinese (Simplified)', nativeName: '\u4e2d\u6587' },
  'zh-TW': { name: 'Chinese (Traditional)', nativeName: '\u7e41\u9ad4\u4e2d\u6587' },
  ja: { name: 'Japanese', nativeName: '\u65e5\u672c\u8a9e' },
  ko: { name: 'Korean', nativeName: '\ud55c\uad6d\uc5b4' },
  ar: { name: 'Arabic', nativeName: '\u0627\u0644\u0639\u0631\u0628\u064a\u0629' },
  hi: { name: 'Hindi', nativeName: '\u0939\u093f\u0928\u094d\u0926\u0940' },
  sw: { name: 'Swahili', nativeName: 'Kiswahili' },
  yo: { name: 'Yoruba', nativeName: 'Yor\u00f9b\u00e1' },
  ha: { name: 'Hausa', nativeName: 'Hausa' },
  ig: { name: 'Igbo', nativeName: 'As\u1ee5s\u1ee5 Igbo' },
  zu: { name: 'Zulu', nativeName: 'isiZulu' },
  af: { name: 'Afrikaans', nativeName: 'Afrikaans' },
};

/**
 * Translation prompt templates
 */
export const TRANSLATION_PROMPTS = {
  [TranslationContentType.PRODUCT_TITLE]: `
You are an expert e-commerce translator. Translate the following product title from {source_locale} to {target_locale}.
Keep it concise, compelling, and culturally appropriate for the target market.
Preserve any brand names, model numbers, or technical specifications.

Product Title: {text}

Translated Title:`,

  [TranslationContentType.PRODUCT_DESCRIPTION]: `
You are an expert e-commerce translator. Translate the following product description from {source_locale} to {target_locale}.
Maintain the marketing tone while ensuring cultural appropriateness.
Preserve any HTML/markdown formatting exactly as is.
Keep bullet points, lists, and paragraph structure intact.

Product Description:
{text}

Translated Description:`,

  [TranslationContentType.PRODUCT_FEATURES]: `
Translate the following product features from {source_locale} to {target_locale}.
Keep each feature concise and impactful.
Preserve the list format.

Features:
{text}

Translated Features:`,

  [TranslationContentType.CATEGORY_NAME]: `
Translate this e-commerce category name from {source_locale} to {target_locale}.
Keep it short, clear, and appropriate for navigation.

Category: {text}

Translated Category:`,

  [TranslationContentType.CATEGORY_DESCRIPTION]: `
Translate this category description from {source_locale} to {target_locale}.
Maintain SEO-friendly language while being culturally appropriate.

Description: {text}

Translated Description:`,

  [TranslationContentType.PAGE_CONTENT]: `
Translate the following page content from {source_locale} to {target_locale}.
Preserve all HTML/markdown formatting, links, and structure.
Maintain the tone and style of the original.

Content:
{text}

Translated Content:`,

  [TranslationContentType.EMAIL_TEMPLATE]: `
Translate this email template from {source_locale} to {target_locale}.
Preserve all template variables (e.g., {{name}}, {order_id}).
Maintain the professional tone and formatting.

Email Content:
{text}

Translated Email:`,

  [TranslationContentType.UI_STRING]: `
Translate this UI string from {source_locale} to {target_locale}.
Keep it concise and clear for a user interface context.
Preserve any placeholder variables.

String: {text}

Translation:`,
};

/**
 * Quality check thresholds
 */
export const TRANSLATION_QUALITY = {
  /** Minimum acceptable quality score */
  MIN_QUALITY_SCORE: 70,
  /** Score requiring review */
  REVIEW_THRESHOLD: 85,
  /** Maximum length ratio (translated/source) */
  MAX_LENGTH_RATIO: 2.0,
  /** Minimum length ratio */
  MIN_LENGTH_RATIO: 0.3,
} as const;
