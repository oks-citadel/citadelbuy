import { Injectable, Logger, Type } from '@nestjs/common';
import { plainToInstance, ClassConstructor } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';

/**
 * Schema validation result
 */
export interface SchemaValidationResult {
  isValid: boolean;
  errors: SchemaValidationError[];
  sanitizedData?: any;
}

/**
 * Schema validation error detail
 */
export interface SchemaValidationError {
  path: string;
  constraints: string[];
  value?: any;
  children?: SchemaValidationError[];
}

/**
 * Configuration options for schema validation
 */
export interface SchemaValidationOptions {
  /**
   * Whether to strip unknown properties from the object
   * @default true
   */
  whitelist?: boolean;

  /**
   * Whether to throw an error if unknown properties are found
   * @default false
   */
  forbidNonWhitelisted?: boolean;

  /**
   * Whether to skip missing properties validation
   * @default false
   */
  skipMissingProperties?: boolean;

  /**
   * Whether to skip null properties validation
   * @default false
   */
  skipNullProperties?: boolean;

  /**
   * Whether to skip undefined properties validation
   * @default false
   */
  skipUndefinedProperties?: boolean;

  /**
   * Whether to log validation errors
   * @default true in development, false in production
   */
  logErrors?: boolean;

  /**
   * Whether validation is for request or response
   * @default 'response'
   */
  validationType?: 'request' | 'response';
}

/**
 * Schema Validation Service
 *
 * Provides runtime validation of data against TypeScript classes decorated with
 * class-validator decorators. This service can be used for:
 *
 * 1. Response validation - Ensure API responses match expected schema
 * 2. Request validation - Additional validation beyond built-in pipe
 * 3. Data transformation - Convert plain objects to class instances
 *
 * Usage:
 * ```typescript
 * @Injectable()
 * class MyService {
 *   constructor(private schemaValidation: SchemaValidationService) {}
 *
 *   async getData() {
 *     const data = await this.fetchData();
 *     const result = await this.schemaValidation.validate(data, MyResponseDto);
 *     if (!result.isValid) {
 *       this.logger.warn('Response validation failed', result.errors);
 *     }
 *     return result.sanitizedData || data;
 *   }
 * }
 * ```
 */
@Injectable()
export class SchemaValidationService {
  private readonly logger = new Logger(SchemaValidationService.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  /**
   * Validate data against a schema class
   *
   * @param data - The data to validate
   * @param schema - The class with validation decorators
   * @param options - Validation options
   * @returns Validation result with errors and sanitized data
   */
  async validate<T extends object>(
    data: any,
    schema: ClassConstructor<T>,
    options: SchemaValidationOptions = {},
  ): Promise<SchemaValidationResult> {
    const {
      whitelist = true,
      forbidNonWhitelisted = false,
      skipMissingProperties = false,
      skipNullProperties = false,
      skipUndefinedProperties = false,
      logErrors = !this.isProduction,
      validationType = 'response',
    } = options;

    try {
      // Transform plain object to class instance
      const instance = plainToInstance(schema, data, {
        excludeExtraneousValues: false,
        enableImplicitConversion: true,
        exposeDefaultValues: true,
      });

      // Validate the instance
      const errors = await validate(instance, {
        whitelist,
        forbidNonWhitelisted,
        skipMissingProperties,
        skipNullProperties,
        skipUndefinedProperties,
        validationError: {
          target: false, // Don't include target object in errors (security)
          value: !this.isProduction, // Only include values in dev
        },
      });

      if (errors.length > 0) {
        const formattedErrors = this.formatErrors(errors);

        if (logErrors) {
          this.logger.warn(
            `${validationType} validation failed for ${schema.name}:`,
            { errors: formattedErrors },
          );
        }

        return {
          isValid: false,
          errors: formattedErrors,
          sanitizedData: whitelist ? instance : data,
        };
      }

      return {
        isValid: true,
        errors: [],
        sanitizedData: instance,
      };
    } catch (error) {
      this.logger.error(
        `Schema validation error for ${schema.name}:`,
        error instanceof Error ? error.message : String(error),
      );

      return {
        isValid: false,
        errors: [
          {
            path: 'root',
            constraints: [
              `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            ],
          },
        ],
      };
    }
  }

  /**
   * Validate an array of items against a schema
   */
  async validateArray<T extends object>(
    data: any[],
    schema: ClassConstructor<T>,
    options: SchemaValidationOptions = {},
  ): Promise<SchemaValidationResult> {
    if (!Array.isArray(data)) {
      return {
        isValid: false,
        errors: [
          {
            path: 'root',
            constraints: ['Expected an array'],
          },
        ],
      };
    }

    const allErrors: SchemaValidationError[] = [];
    const sanitizedItems: T[] = [];

    for (let i = 0; i < data.length; i++) {
      const result = await this.validate(data[i], schema, {
        ...options,
        logErrors: false, // Don't log individual items
      });

      if (!result.isValid) {
        // Add index to error paths
        const indexedErrors = result.errors.map((error) => ({
          ...error,
          path: `[${i}].${error.path}`,
        }));
        allErrors.push(...indexedErrors);
      }

      if (result.sanitizedData) {
        sanitizedItems.push(result.sanitizedData);
      }
    }

    if (allErrors.length > 0 && options.logErrors !== false) {
      this.logger.warn(
        `Array validation failed for ${schema.name}[]:`,
        { errorCount: allErrors.length },
      );
    }

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      sanitizedData: sanitizedItems,
    };
  }

  /**
   * Synchronous validation - transforms and validates without async
   * Useful for simple validations where async is not needed
   */
  validateSync<T extends object>(
    data: any,
    schema: ClassConstructor<T>,
    options: SchemaValidationOptions = {},
  ): { instance: T; isValid: boolean } {
    const instance = plainToInstance(schema, data, {
      excludeExtraneousValues: false,
      enableImplicitConversion: true,
      exposeDefaultValues: true,
    });

    // Note: This is a synchronous transform-only operation
    // For full validation, use the async validate() method
    return {
      instance,
      isValid: true, // Sync validation only does transformation
    };
  }

  /**
   * Check if a value matches expected type
   */
  isValidType(value: any, expectedType: 'string' | 'number' | 'boolean' | 'object' | 'array'): boolean {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return false;
    }
  }

  /**
   * Coerce a value to expected type if possible
   */
  coerceType(value: any, targetType: 'string' | 'number' | 'boolean'): any {
    if (value === null || value === undefined) {
      return value;
    }

    switch (targetType) {
      case 'string':
        return String(value);
      case 'number': {
        const num = Number(value);
        return isNaN(num) ? value : num;
      }
      case 'boolean':
        if (typeof value === 'string') {
          return value.toLowerCase() === 'true';
        }
        return Boolean(value);
      default:
        return value;
    }
  }

  /**
   * Format validation errors into a consistent structure
   */
  private formatErrors(
    errors: ValidationError[],
    parentPath = '',
  ): SchemaValidationError[] {
    const result: SchemaValidationError[] = [];

    for (const error of errors) {
      const path = parentPath ? `${parentPath}.${error.property}` : error.property;

      if (error.constraints) {
        result.push({
          path,
          constraints: Object.values(error.constraints),
          value: error.value,
        });
      }

      if (error.children && error.children.length > 0) {
        const childErrors = this.formatErrors(error.children, path);
        result.push(...childErrors);
      }
    }

    return result;
  }
}
