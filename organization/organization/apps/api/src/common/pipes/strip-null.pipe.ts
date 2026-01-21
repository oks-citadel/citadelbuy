import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

/**
 * Configuration for null stripping behavior
 */
export interface StripNullPipeOptions {
  /**
   * Convert null arrays to empty arrays
   * @default true
   */
  nullArraysToEmpty?: boolean;

  /**
   * Convert null strings to empty strings
   * @default false
   */
  nullStringsToEmpty?: boolean;

  /**
   * Remove properties with null values entirely
   * @default false
   */
  removeNullProperties?: boolean;

  /**
   * Remove properties with undefined values
   * @default true
   */
  removeUndefinedProperties?: boolean;

  /**
   * Recursively process nested objects
   * @default true
   */
  recursive?: boolean;

  /**
   * Field names that should always be converted to empty arrays if null
   */
  arrayFields?: string[];
}

/**
 * Strip Null Pipe
 *
 * Transforms null values to appropriate defaults to prevent frontend issues.
 * Can be used on both request (incoming) and response (outgoing) data.
 *
 * Usage:
 * ```typescript
 * @Get(':id')
 * @UsePipes(new StripNullPipe({ nullArraysToEmpty: true }))
 * async findOne(@Param('id') id: string) {
 *   return this.service.findOne(id);
 * }
 * ```
 */
@Injectable()
export class StripNullPipe implements PipeTransform {
  private readonly options: Required<Omit<StripNullPipeOptions, 'arrayFields'>> & {
    arrayFields: string[];
  };

  constructor(options: StripNullPipeOptions = {}) {
    this.options = {
      nullArraysToEmpty: options.nullArraysToEmpty ?? true,
      nullStringsToEmpty: options.nullStringsToEmpty ?? false,
      removeNullProperties: options.removeNullProperties ?? false,
      removeUndefinedProperties: options.removeUndefinedProperties ?? true,
      recursive: options.recursive ?? true,
      arrayFields: options.arrayFields ?? [],
    };
  }

  transform(value: any, metadata: ArgumentMetadata): any {
    if (value === null || value === undefined) {
      return value;
    }

    if (Array.isArray(value)) {
      return this.processArray(value);
    }

    if (typeof value === 'object' && value !== null) {
      return this.processObject(value);
    }

    return value;
  }

  private processObject(obj: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, value] of Object.entries(obj)) {
      const processedValue = this.processValue(key, value);

      // Check if we should include this property
      if (processedValue === undefined && this.options.removeUndefinedProperties) {
        continue;
      }
      if (processedValue === null && this.options.removeNullProperties) {
        continue;
      }

      result[key] = processedValue;
    }

    return result;
  }

  private processArray(arr: any[]): any[] {
    return arr
      .filter((item) => item !== undefined) // Always filter undefined from arrays
      .map((item) => {
        if (this.options.recursive && typeof item === 'object' && item !== null) {
          return Array.isArray(item)
            ? this.processArray(item)
            : this.processObject(item);
        }
        return item;
      });
  }

  private processValue(key: string, value: any): any {
    // Handle null values
    if (value === null) {
      // Check if this field should be an empty array
      if (this.isArrayField(key)) {
        return [];
      }
      if (this.options.nullStringsToEmpty && this.isStringField(key)) {
        return '';
      }
      return null;
    }

    // Handle undefined
    if (value === undefined) {
      if (this.isArrayField(key)) {
        return [];
      }
      return undefined;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      if (this.options.recursive) {
        return this.processArray(value);
      }
      return value;
    }

    // Handle nested objects
    if (typeof value === 'object' && value !== null) {
      // Don't process Date objects
      if (value instanceof Date) {
        return value;
      }
      if (this.options.recursive) {
        return this.processObject(value);
      }
      return value;
    }

    return value;
  }

  /**
   * Check if a field name suggests it should be an array
   */
  private isArrayField(fieldName: string): boolean {
    // Check explicit array fields
    if (this.options.arrayFields.includes(fieldName)) {
      return true;
    }

    // Check common array patterns
    const arrayPatterns = [
      /s$/i, // plurals
      /list$/i,
      /array$/i,
      /ids$/i,
      /items$/i,
      /images$/i,
      /tags$/i,
      /categories$/i,
      /options$/i,
      /permissions$/i,
      /roles$/i,
      /children$/i,
      /variants$/i,
    ];

    return (
      this.options.nullArraysToEmpty &&
      arrayPatterns.some((pattern) => pattern.test(fieldName))
    );
  }

  /**
   * Check if a field name suggests it should be a string
   */
  private isStringField(fieldName: string): boolean {
    const stringPatterns = [
      /name$/i,
      /title$/i,
      /description$/i,
      /content$/i,
      /text$/i,
      /message$/i,
      /email$/i,
      /phone$/i,
      /address$/i,
      /url$/i,
      /path$/i,
      /code$/i,
      /sku$/i,
    ];

    return stringPatterns.some((pattern) => pattern.test(fieldName));
  }
}

/**
 * Factory function for creating a strip null pipe with default options
 */
export function createStripNullPipe(options?: StripNullPipeOptions): StripNullPipe {
  return new StripNullPipe(options);
}
