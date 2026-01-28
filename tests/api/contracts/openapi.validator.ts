/**
 * OpenAPI Contract Validator
 *
 * Validates API responses against the OpenAPI specification.
 * Ensures API behavior matches documented contracts.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

// Type definitions for OpenAPI schema
interface OpenAPISchema {
  type?: string;
  properties?: Record<string, OpenAPISchema>;
  required?: string[];
  items?: OpenAPISchema;
  enum?: unknown[];
  format?: string;
  nullable?: boolean;
  $ref?: string;
  allOf?: OpenAPISchema[];
  oneOf?: OpenAPISchema[];
  anyOf?: OpenAPISchema[];
}

interface OpenAPIResponse {
  description: string;
  content?: {
    'application/json'?: {
      schema: OpenAPISchema;
    };
  };
}

interface OpenAPIOperation {
  operationId: string;
  responses: Record<string, OpenAPIResponse>;
  requestBody?: {
    content: {
      'application/json'?: {
        schema: OpenAPISchema;
      };
    };
  };
}

interface OpenAPIPath {
  get?: OpenAPIOperation;
  post?: OpenAPIOperation;
  put?: OpenAPIOperation;
  patch?: OpenAPIOperation;
  delete?: OpenAPIOperation;
}

interface OpenAPISpec {
  paths: Record<string, OpenAPIPath>;
  components: {
    schemas: Record<string, OpenAPISchema>;
  };
}

export class OpenAPIValidator {
  private spec: OpenAPISpec;
  private schemas: Record<string, OpenAPISchema>;

  constructor(specPath?: string) {
    const defaultPath = path.join(__dirname, '../../../docs/api/openapi.yaml');
    const specContent = fs.readFileSync(specPath || defaultPath, 'utf-8');
    this.spec = yaml.load(specContent) as OpenAPISpec;
    this.schemas = this.spec.components?.schemas || {};
  }

  /**
   * Resolves $ref references in schema
   */
  private resolveRef(schema: OpenAPISchema): OpenAPISchema {
    if (schema.$ref) {
      const refPath = schema.$ref.replace('#/components/schemas/', '');
      return this.schemas[refPath] || schema;
    }
    return schema;
  }

  /**
   * Validates a value against an OpenAPI schema
   */
  validateSchema(value: unknown, schema: OpenAPISchema, path = 'root'): ValidationResult {
    const errors: ValidationError[] = [];
    const resolvedSchema = this.resolveRef(schema);

    // Handle nullable
    if (value === null) {
      if (resolvedSchema.nullable) {
        return { valid: true, errors: [] };
      }
      errors.push({ path, message: 'Value is null but schema is not nullable' });
      return { valid: false, errors };
    }

    // Handle allOf
    if (resolvedSchema.allOf) {
      for (const subSchema of resolvedSchema.allOf) {
        const result = this.validateSchema(value, subSchema, path);
        if (!result.valid) {
          errors.push(...result.errors);
        }
      }
      return { valid: errors.length === 0, errors };
    }

    // Handle oneOf/anyOf
    if (resolvedSchema.oneOf || resolvedSchema.anyOf) {
      const schemas = resolvedSchema.oneOf || resolvedSchema.anyOf || [];
      const matchingSchemas = schemas.filter(
        (s) => this.validateSchema(value, s, path).valid
      );

      if (matchingSchemas.length === 0) {
        errors.push({
          path,
          message: `Value does not match any of the ${resolvedSchema.oneOf ? 'oneOf' : 'anyOf'} schemas`,
        });
      }
      return { valid: errors.length === 0, errors };
    }

    // Type validation
    const expectedType = resolvedSchema.type;
    const actualType = this.getType(value);

    if (expectedType && expectedType !== actualType) {
      // Allow integer for number type
      if (!(expectedType === 'integer' && actualType === 'number' && Number.isInteger(value))) {
        errors.push({
          path,
          message: `Expected type '${expectedType}' but got '${actualType}'`,
        });
        return { valid: false, errors };
      }
    }

    // Enum validation
    if (resolvedSchema.enum && !resolvedSchema.enum.includes(value)) {
      errors.push({
        path,
        message: `Value '${value}' is not in enum: ${JSON.stringify(resolvedSchema.enum)}`,
      });
    }

    // Format validation
    if (resolvedSchema.format) {
      const formatValid = this.validateFormat(value as string, resolvedSchema.format);
      if (!formatValid) {
        errors.push({
          path,
          message: `Value does not match format '${resolvedSchema.format}'`,
        });
      }
    }

    // Object validation
    if (resolvedSchema.type === 'object' && typeof value === 'object') {
      const obj = value as Record<string, unknown>;

      // Required fields
      if (resolvedSchema.required) {
        for (const requiredField of resolvedSchema.required) {
          if (!(requiredField in obj)) {
            errors.push({
              path: `${path}.${requiredField}`,
              message: `Missing required field '${requiredField}'`,
            });
          }
        }
      }

      // Property validation
      if (resolvedSchema.properties) {
        for (const [propName, propSchema] of Object.entries(resolvedSchema.properties)) {
          if (propName in obj) {
            const result = this.validateSchema(obj[propName], propSchema, `${path}.${propName}`);
            errors.push(...result.errors);
          }
        }
      }
    }

    // Array validation
    if (resolvedSchema.type === 'array' && Array.isArray(value)) {
      if (resolvedSchema.items) {
        value.forEach((item, index) => {
          const result = this.validateSchema(item, resolvedSchema.items!, `${path}[${index}]`);
          errors.push(...result.errors);
        });
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validates API response against OpenAPI spec
   */
  validateResponse(
    method: string,
    pathPattern: string,
    statusCode: number,
    responseBody: unknown
  ): ValidationResult {
    const pathSpec = this.spec.paths[pathPattern];
    if (!pathSpec) {
      return {
        valid: false,
        errors: [{ path: 'spec', message: `Path '${pathPattern}' not found in OpenAPI spec` }],
      };
    }

    const operation = pathSpec[method.toLowerCase() as keyof OpenAPIPath];
    if (!operation) {
      return {
        valid: false,
        errors: [{ path: 'spec', message: `Method '${method}' not found for path '${pathPattern}'` }],
      };
    }

    const responseSpec = operation.responses[statusCode.toString()] || operation.responses['default'];
    if (!responseSpec) {
      return {
        valid: false,
        errors: [
          { path: 'spec', message: `Status code '${statusCode}' not documented for ${method} ${pathPattern}` },
        ],
      };
    }

    const schema = responseSpec.content?.['application/json']?.schema;
    if (!schema) {
      // No schema defined, just validate that response exists
      return { valid: true, errors: [] };
    }

    return this.validateSchema(responseBody, schema);
  }

  /**
   * Gets JavaScript type of a value
   */
  private getType(value: unknown): string {
    if (Array.isArray(value)) return 'array';
    if (value === null) return 'null';
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'integer' : 'number';
    }
    return typeof value;
  }

  /**
   * Validates string formats
   */
  private validateFormat(value: string, format: string): boolean {
    if (typeof value !== 'string') return false;

    const formatValidators: Record<string, (v: string) => boolean> = {
      email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      uuid: (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
      'date-time': (v) => !isNaN(Date.parse(v)),
      date: (v) => /^\d{4}-\d{2}-\d{2}$/.test(v),
      uri: (v) => {
        try {
          new URL(v);
          return true;
        } catch {
          return false;
        }
      },
    };

    const validator = formatValidators[format];
    return validator ? validator(value) : true;
  }

  /**
   * Gets all documented endpoints
   */
  getEndpoints(): EndpointInfo[] {
    const endpoints: EndpointInfo[] = [];
    const methods = ['get', 'post', 'put', 'patch', 'delete'] as const;

    for (const [path, pathSpec] of Object.entries(this.spec.paths)) {
      for (const method of methods) {
        const operation = pathSpec[method];
        if (operation) {
          endpoints.push({
            method: method.toUpperCase(),
            path,
            operationId: operation.operationId,
            responses: Object.keys(operation.responses).map(Number),
          });
        }
      }
    }

    return endpoints;
  }
}

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface EndpointInfo {
  method: string;
  path: string;
  operationId: string;
  responses: number[];
}

// Export singleton instance
export const validator = new OpenAPIValidator();

// Jest matcher for schema validation
export function toMatchOpenAPISchema(
  this: { isNot: boolean },
  received: { body: unknown; status: number },
  method: string,
  path: string
) {
  const result = validator.validateResponse(method, path, received.status, received.body);

  if (result.valid) {
    return {
      pass: true,
      message: () => `Expected response NOT to match OpenAPI schema for ${method} ${path}`,
    };
  }

  return {
    pass: false,
    message: () =>
      `Expected response to match OpenAPI schema for ${method} ${path}:\n${result.errors
        .map((e) => `  - ${e.path}: ${e.message}`)
        .join('\n')}`,
  };
}

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toMatchOpenAPISchema(method: string, path: string): R;
    }
  }
}
