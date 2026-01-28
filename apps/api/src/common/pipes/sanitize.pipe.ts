import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Sanitization configuration options
 */
export interface SanitizeOptions {
  /** Allow specific HTML tags (for rich text fields) */
  allowedTags?: string[];
  /** Allow specific HTML attributes */
  allowedAttributes?: Record<string, string[]>;
  /** Maximum string length */
  maxLength?: number;
  /** Strip all HTML (overrides allowedTags) */
  stripHtml?: boolean;
  /** Trim whitespace */
  trim?: boolean;
  /** Convert to lowercase */
  lowercase?: boolean;
  /** Custom sanitizer function */
  customSanitizer?: (value: string) => string;
}

/**
 * Default allowed HTML tags for rich text content
 */
const DEFAULT_ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'a',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'blockquote',
  'span',
  'div',
];

/**
 * Default allowed attributes per tag
 */
const DEFAULT_ALLOWED_ATTRIBUTES: Record<string, string[]> = {
  a: ['href', 'title', 'target', 'rel'],
  span: ['class'],
  div: ['class'],
  img: ['src', 'alt', 'title', 'width', 'height'], // Only if img is allowed
};

/**
 * Dangerous patterns to detect and remove
 */
const DANGEROUS_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  // Script injection
  { pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, name: 'script_tag' },
  { pattern: /javascript:/gi, name: 'javascript_protocol' },
  { pattern: /vbscript:/gi, name: 'vbscript_protocol' },
  { pattern: /data:\s*text\/html/gi, name: 'data_html' },

  // Event handlers
  { pattern: /\bon\w+\s*=/gi, name: 'event_handler' },

  // Expression injection
  { pattern: /expression\s*\(/gi, name: 'css_expression' },

  // Base64 encoded content that could be malicious
  { pattern: /data:[^;]*;base64,[a-zA-Z0-9+/]+=*/gi, name: 'base64_data' },

  // SVG-based XSS
  { pattern: /<svg[^>]*onload/gi, name: 'svg_onload' },

  // Meta refresh
  { pattern: /<meta[^>]*http-equiv\s*=\s*["']?refresh/gi, name: 'meta_refresh' },

  // Object/embed tags
  { pattern: /<object\b[^>]*>/gi, name: 'object_tag' },
  { pattern: /<embed\b[^>]*>/gi, name: 'embed_tag' },

  // iframe injection
  { pattern: /<iframe\b[^>]*>/gi, name: 'iframe_tag' },

  // Form action injection
  { pattern: /<form\b[^>]*>/gi, name: 'form_tag' },

  // Style-based attacks
  { pattern: /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, name: 'style_tag' },

  // Import statements
  { pattern: /@import\s/gi, name: 'css_import' },

  // URL manipulation
  { pattern: /url\s*\(\s*["']?\s*javascript:/gi, name: 'url_javascript' },
];

/**
 * Sanitize Pipe
 *
 * Provides comprehensive input sanitization to prevent XSS attacks.
 * Can be applied globally or per-route/parameter.
 *
 * SECURITY: Critical for preventing stored XSS attacks.
 */
@Injectable()
export class SanitizePipe implements PipeTransform {
  private readonly logger = new Logger(SanitizePipe.name);
  private readonly defaultOptions: SanitizeOptions;

  constructor(
    private readonly options: SanitizeOptions = {},
    private readonly configService?: ConfigService,
  ) {
    this.defaultOptions = {
      allowedTags: DEFAULT_ALLOWED_TAGS,
      allowedAttributes: DEFAULT_ALLOWED_ATTRIBUTES,
      maxLength: 10000,
      stripHtml: false,
      trim: true,
      ...options,
    };
  }

  transform(value: any, metadata: ArgumentMetadata): any {
    if (value === null || value === undefined) {
      return value;
    }

    // Handle different types
    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.transform(item, metadata));
    }

    if (typeof value === 'object') {
      return this.sanitizeObject(value);
    }

    return value;
  }

  /**
   * Sanitize a string value
   */
  private sanitizeString(value: string): string {
    let sanitized = value;

    // Trim whitespace
    if (this.defaultOptions.trim) {
      sanitized = sanitized.trim();
    }

    // Check for dangerous patterns and log if found
    for (const { pattern, name } of DANGEROUS_PATTERNS) {
      if (pattern.test(sanitized)) {
        this.logger.warn({
          message: 'Dangerous pattern detected in input',
          pattern: name,
          // Don't log the actual value as it may contain malicious code
        });

        // Remove the dangerous pattern
        sanitized = sanitized.replace(pattern, '');
      }
    }

    // Strip all HTML if requested
    if (this.defaultOptions.stripHtml) {
      sanitized = this.stripAllHtml(sanitized);
    } else {
      // Remove disallowed tags while keeping allowed ones
      sanitized = this.sanitizeHtml(sanitized);
    }

    // Enforce maximum length
    if (this.defaultOptions.maxLength && sanitized.length > this.defaultOptions.maxLength) {
      sanitized = sanitized.substring(0, this.defaultOptions.maxLength);
    }

    // Convert to lowercase if requested
    if (this.defaultOptions.lowercase) {
      sanitized = sanitized.toLowerCase();
    }

    // Apply custom sanitizer if provided
    if (this.defaultOptions.customSanitizer) {
      sanitized = this.defaultOptions.customSanitizer(sanitized);
    }

    return sanitized;
  }

  /**
   * Strip all HTML tags
   */
  private stripAllHtml(value: string): string {
    return value
      .replace(/<[^>]*>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');
  }

  /**
   * Sanitize HTML keeping only allowed tags and attributes
   */
  private sanitizeHtml(value: string): string {
    const allowedTags = this.defaultOptions.allowedTags || [];
    const allowedAttributes = this.defaultOptions.allowedAttributes || {};

    // Create regex for allowed tags
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g;

    let result = value.replace(tagRegex, (match, tagName, attributes) => {
      const lowerTagName = tagName.toLowerCase();

      // Check if tag is allowed
      if (!allowedTags.includes(lowerTagName)) {
        return ''; // Remove disallowed tag
      }

      // Sanitize attributes
      const allowedAttrs = allowedAttributes[lowerTagName] || [];
      const sanitizedAttrs = this.sanitizeAttributes(attributes, allowedAttrs, lowerTagName);

      // Check if it's a closing tag
      if (match.startsWith('</')) {
        return `</${lowerTagName}>`;
      }

      // Check if it's a self-closing tag
      const isSelfClosing = match.endsWith('/>');
      const suffix = isSelfClosing ? ' />' : '>';

      return `<${lowerTagName}${sanitizedAttrs}${suffix}`;
    });

    // Decode HTML entities that could be used to bypass filters
    result = this.decodeAndRecheck(result);

    return result;
  }

  /**
   * Sanitize HTML attributes
   */
  private sanitizeAttributes(
    attributes: string,
    allowedAttrs: string[],
    tagName: string,
  ): string {
    if (!attributes || allowedAttrs.length === 0) {
      return '';
    }

    const attrRegex = /([a-zA-Z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*))/g;
    const sanitizedPairs: string[] = [];

    let match;
    while ((match = attrRegex.exec(attributes)) !== null) {
      const attrName = match[1].toLowerCase();
      const attrValue = match[2] || match[3] || match[4] || '';

      // Check if attribute is allowed
      if (!allowedAttrs.includes(attrName)) {
        continue;
      }

      // Special handling for href attributes
      if (attrName === 'href') {
        const sanitizedHref = this.sanitizeHref(attrValue);
        if (sanitizedHref) {
          sanitizedPairs.push(`${attrName}="${sanitizedHref}"`);

          // Add rel="noopener noreferrer" for external links
          if (tagName === 'a' && !attrValue.startsWith('/') && !attrValue.startsWith('#')) {
            if (!allowedAttrs.includes('rel') || !attributes.includes('rel=')) {
              sanitizedPairs.push('rel="noopener noreferrer"');
            }
          }
        }
        continue;
      }

      // Special handling for src attributes
      if (attrName === 'src') {
        const sanitizedSrc = this.sanitizeSrc(attrValue);
        if (sanitizedSrc) {
          sanitizedPairs.push(`${attrName}="${sanitizedSrc}"`);
        }
        continue;
      }

      // Sanitize attribute value
      const sanitizedValue = this.escapeAttributeValue(attrValue);
      sanitizedPairs.push(`${attrName}="${sanitizedValue}"`);
    }

    return sanitizedPairs.length > 0 ? ' ' + sanitizedPairs.join(' ') : '';
  }

  /**
   * Sanitize href attribute
   */
  private sanitizeHref(value: string): string | null {
    const trimmed = value.trim().toLowerCase();

    // Allow relative URLs, anchors, and mailto/tel protocols
    if (
      trimmed.startsWith('/') ||
      trimmed.startsWith('#') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('mailto:') ||
      trimmed.startsWith('tel:')
    ) {
      return this.escapeAttributeValue(value);
    }

    // Block dangerous protocols
    if (
      trimmed.startsWith('javascript:') ||
      trimmed.startsWith('vbscript:') ||
      trimmed.startsWith('data:')
    ) {
      this.logger.warn({
        message: 'Blocked dangerous href protocol',
        protocol: trimmed.split(':')[0],
      });
      return null;
    }

    // Default: treat as relative URL
    return this.escapeAttributeValue(value);
  }

  /**
   * Sanitize src attribute
   */
  private sanitizeSrc(value: string): string | null {
    const trimmed = value.trim().toLowerCase();

    // Allow relative URLs and https URLs
    if (
      trimmed.startsWith('/') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('http://') // Consider blocking http:// in production
    ) {
      return this.escapeAttributeValue(value);
    }

    // Block dangerous protocols
    if (
      trimmed.startsWith('javascript:') ||
      trimmed.startsWith('vbscript:') ||
      trimmed.startsWith('data:')
    ) {
      this.logger.warn({
        message: 'Blocked dangerous src protocol',
        protocol: trimmed.split(':')[0],
      });
      return null;
    }

    return null;
  }

  /**
   * Escape attribute value
   */
  private escapeAttributeValue(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Decode HTML entities and recheck for dangerous patterns
   */
  private decodeAndRecheck(value: string): string {
    // Decode common HTML entities
    const decoded = value
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)));

    // Recheck for dangerous patterns that might have been entity-encoded
    let result = decoded;
    for (const { pattern, name } of DANGEROUS_PATTERNS) {
      if (pattern.test(result)) {
        this.logger.warn({
          message: 'Dangerous pattern detected after entity decoding',
          pattern: name,
        });
        result = result.replace(pattern, '');
      }
    }

    return result;
  }

  /**
   * Sanitize an object recursively
   */
  private sanitizeObject(obj: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      // Sanitize the key as well (prevent prototype pollution)
      const sanitizedKey = this.sanitizeKey(key);

      if (typeof value === 'string') {
        sanitized[sanitizedKey] = this.sanitizeString(value);
      } else if (Array.isArray(value)) {
        sanitized[sanitizedKey] = value.map((item) =>
          typeof item === 'string'
            ? this.sanitizeString(item)
            : typeof item === 'object' && item !== null
              ? this.sanitizeObject(item)
              : item,
        );
      } else if (typeof value === 'object' && value !== null) {
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      } else {
        sanitized[sanitizedKey] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize object key to prevent prototype pollution
   */
  private sanitizeKey(key: string): string {
    const dangerous = ['__proto__', 'constructor', 'prototype'];
    if (dangerous.includes(key.toLowerCase())) {
      throw new BadRequestException(`Invalid property name: ${key}`);
    }
    return key;
  }
}

/**
 * Decorator for applying sanitization to specific fields
 */
export function Sanitize(options?: SanitizeOptions): PropertyDecorator {
  return (target: any, propertyKey: string | symbol) => {
    const existingOptions =
      Reflect.getMetadata('sanitize:options', target.constructor) || {};
    existingOptions[propertyKey] = options || {};
    Reflect.defineMetadata('sanitize:options', existingOptions, target.constructor);
  };
}

/**
 * Factory function to create pre-configured sanitize pipes
 */
export const SanitizePipes = {
  /** Strict sanitization - strips all HTML */
  strict: () =>
    new SanitizePipe({
      stripHtml: true,
      trim: true,
    }),

  /** Rich text sanitization - allows safe HTML subset */
  richText: () =>
    new SanitizePipe({
      allowedTags: DEFAULT_ALLOWED_TAGS,
      allowedAttributes: DEFAULT_ALLOWED_ATTRIBUTES,
      trim: true,
    }),

  /** Product description sanitization */
  productDescription: () =>
    new SanitizePipe({
      allowedTags: [...DEFAULT_ALLOWED_TAGS, 'img', 'table', 'tr', 'td', 'th', 'thead', 'tbody'],
      allowedAttributes: {
        ...DEFAULT_ALLOWED_ATTRIBUTES,
        img: ['src', 'alt', 'title', 'width', 'height'],
        table: ['class'],
        tr: ['class'],
        td: ['class', 'colspan', 'rowspan'],
        th: ['class', 'colspan', 'rowspan'],
      },
      maxLength: 50000,
      trim: true,
    }),

  /** Vendor bio sanitization */
  vendorBio: () =>
    new SanitizePipe({
      allowedTags: ['p', 'br', 'strong', 'em', 'a', 'ul', 'ol', 'li'],
      allowedAttributes: {
        a: ['href', 'title'],
      },
      maxLength: 5000,
      trim: true,
    }),

  /** Translation sanitization */
  translation: () =>
    new SanitizePipe({
      allowedTags: ['br', 'strong', 'em', 'span'],
      allowedAttributes: {
        span: ['class'],
      },
      maxLength: 10000,
      trim: true,
    }),
};
