/**
 * CSV Parser
 *
 * Stream-based CSV parsing with validation, type inference,
 * and error handling for large files.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Readable } from 'stream';
import * as csv from 'csv-parser';
import {
  CsvImportOptions,
  CsvFieldMapping,
  CsvColumnDefinition,
  CsvRowResult,
  CsvParseResult,
  CsvFileInfo,
  CsvColumnDetection,
  CsvValidationRule,
  CsvColumnType,
} from './dto/csv-mapping.dto';

/**
 * Default CSV import options
 */
const DEFAULT_OPTIONS: CsvImportOptions = {
  delimiter: ',',
  quote: '"',
  escape: '"',
  hasHeader: true,
  skipRows: 0,
  encoding: 'utf-8',
  trimValues: true,
  skipEmptyRows: true,
  maxRows: 0,
  emptyValueHandling: 'null',
};

@Injectable()
export class CsvParser {
  private readonly logger = new Logger(CsvParser.name);

  /**
   * Parse CSV buffer/stream and extract data
   */
  async parse(
    input: Buffer | Readable,
    options: Partial<CsvImportOptions> = {},
    fieldMapping?: CsvFieldMapping,
    validationRules?: CsvValidationRule[],
  ): Promise<CsvParseResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const result: CsvParseResult = {
      success: true,
      totalRows: 0,
      successfulRows: 0,
      failedRows: 0,
      rows: [],
      errors: [],
      warnings: [],
    };

    return new Promise((resolve, reject) => {
      const stream = Buffer.isBuffer(input) ? Readable.from(input) : input;

      let rowNumber = 0;
      let skippedRows = 0;
      let headers: string[] = [];

      const parser = csv({
        separator: opts.delimiter,
        quote: opts.quote,
        escape: opts.escape,
        headers: opts.hasHeader ? undefined : false,
        skipLines: opts.skipRows,
        skipComments: opts.commentChar || false,
      });

      stream
        .pipe(parser)
        .on('headers', (headerRow: string[]) => {
          headers = headerRow.map((h) => (opts.trimValues ? h.trim() : h));
          result.headers = headers;
        })
        .on('data', (row: Record<string, string>) => {
          rowNumber++;

          // Check max rows limit
          if (opts.maxRows > 0 && result.totalRows >= opts.maxRows) {
            return;
          }

          // Skip empty rows
          if (opts.skipEmptyRows && this.isEmptyRow(row)) {
            return;
          }

          result.totalRows++;

          try {
            // Process and validate row
            const processedRow = this.processRow(
              row,
              rowNumber,
              opts,
              fieldMapping,
              validationRules,
              headers,
            );

            result.rows.push(processedRow);

            if (processedRow.success) {
              result.successfulRows++;
            } else {
              result.failedRows++;
              if (processedRow.errors) {
                result.errors.push(
                  ...processedRow.errors.map((e) => ({
                    rowNumber,
                    column: e.column,
                    message: e.message,
                  })),
                );
              }
            }

            if (processedRow.warnings) {
              result.warnings.push(
                ...processedRow.warnings.map((w) => ({
                  rowNumber,
                  column: w.column,
                  message: w.message,
                })),
              );
            }
          } catch (error) {
            result.failedRows++;
            result.errors.push({
              rowNumber,
              message: error.message,
            });
          }
        })
        .on('end', () => {
          result.success = result.failedRows === 0;
          resolve(result);
        })
        .on('error', (error) => {
          this.logger.error(`CSV parsing error: ${error.message}`);
          result.success = false;
          result.errors.push({ message: error.message });
          reject(error);
        });
    });
  }

  /**
   * Process a single CSV row
   */
  private processRow(
    row: Record<string, string>,
    rowNumber: number,
    options: CsvImportOptions,
    fieldMapping?: CsvFieldMapping,
    validationRules?: CsvValidationRule[],
    headers?: string[],
  ): CsvRowResult {
    const result: CsvRowResult = {
      rowNumber,
      success: true,
      data: {},
      errors: [],
      warnings: [],
    };

    // Apply trimming
    if (options.trimValues) {
      for (const key of Object.keys(row)) {
        if (typeof row[key] === 'string') {
          row[key] = row[key].trim();
        }
      }
    }

    // If no field mapping, return raw data
    if (!fieldMapping) {
      result.data = row;
      return result;
    }

    // Process mapped fields
    const mappedFields = [
      'externalId',
      'sku',
      'name',
      'description',
      'shortDescription',
      'price',
      'compareAtPrice',
      'costPrice',
      'currency',
      'images',
      'featuredImage',
      'categories',
      'tags',
      'quantity',
      'trackInventory',
      'status',
      'vendor',
      'brand',
      'barcode',
      'weight',
      'length',
      'width',
      'height',
    ] as const;

    for (const field of mappedFields) {
      const mapping = fieldMapping[field as keyof CsvFieldMapping];
      if (mapping && typeof mapping === 'object' && 'column' in mapping) {
        const extractResult = this.extractFieldValue(row, mapping, field, options, headers);

        if (extractResult.error) {
          result.errors!.push({ column: field, message: extractResult.error });
          result.success = false;
        } else if (extractResult.warning) {
          result.warnings!.push({ column: field, message: extractResult.warning });
        }

        if (extractResult.value !== undefined) {
          result.data![field] = extractResult.value;
        }
      }
    }

    // Process metadata fields
    if (fieldMapping.metadata) {
      result.data!.metadata = {};
      for (const [metaKey, mapping] of Object.entries(fieldMapping.metadata)) {
        const extractResult = this.extractFieldValue(row, mapping, metaKey, options, headers);
        if (extractResult.value !== undefined) {
          result.data!.metadata[metaKey] = extractResult.value;
        }
      }
    }

    // Apply validation rules
    if (validationRules) {
      for (const rule of validationRules) {
        const columnName =
          typeof rule.column === 'number' ? headers?.[rule.column] || String(rule.column) : rule.column;
        const value = row[columnName];
        const validationError = this.validateValue(value, rule);

        if (validationError) {
          result.errors!.push({ column: columnName, message: validationError });
          result.success = false;
        }
      }
    }

    return result;
  }

  /**
   * Extract and convert field value from CSV row
   */
  private extractFieldValue(
    row: Record<string, string>,
    mapping: CsvColumnDefinition,
    fieldName: string,
    options: CsvImportOptions,
    headers?: string[],
  ): { value?: any; error?: string; warning?: string } {
    // Get column name
    const columnName =
      typeof mapping.column === 'number'
        ? headers?.[mapping.column] || String(mapping.column)
        : mapping.column;

    let value = row[columnName];

    // Handle empty values
    if (value === undefined || value === null || value === '') {
      if (mapping.required) {
        return { error: `Required field '${fieldName}' is empty` };
      }

      if (mapping.defaultValue !== undefined) {
        return { value: mapping.defaultValue };
      }

      if (options.emptyValueHandling === 'null') {
        return { value: null };
      }

      return {};
    }

    // Apply transformation
    if (mapping.transform) {
      value = this.applyTransformation(value, mapping.transform);
    }

    // Convert type
    try {
      const convertedValue = this.convertType(value, mapping);

      // Validate pattern
      if (mapping.validationPattern) {
        const regex = new RegExp(mapping.validationPattern);
        if (!regex.test(String(value))) {
          return {
            error: mapping.validationMessage || `Value '${value}' does not match required pattern`,
          };
        }
      }

      return { value: convertedValue };
    } catch (error) {
      return { error: `Failed to convert '${fieldName}': ${error.message}` };
    }
  }

  /**
   * Convert value to specified type
   */
  private convertType(value: string, mapping: CsvColumnDefinition): any {
    switch (mapping.type) {
      case 'string':
        return value;

      case 'number':
        const decimalSep = mapping.decimalSeparator || '.';
        let numStr = value.replace(/[^0-9,.-]/g, '');
        if (decimalSep !== '.') {
          numStr = numStr.replace(decimalSep, '.');
        }
        const num = parseFloat(numStr);
        if (isNaN(num)) {
          throw new Error(`Invalid number: ${value}`);
        }
        return num;

      case 'boolean':
        const lowerValue = value.toLowerCase();
        return ['true', '1', 'yes', 'on', 'y'].includes(lowerValue);

      case 'date':
        const date = mapping.dateFormat
          ? this.parseDate(value, mapping.dateFormat)
          : new Date(value);
        if (isNaN(date.getTime())) {
          throw new Error(`Invalid date: ${value}`);
        }
        return date;

      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          throw new Error(`Invalid JSON: ${value}`);
        }

      case 'array':
        const delimiter = mapping.arrayDelimiter || ',';
        return value
          .split(delimiter)
          .map((s) => s.trim())
          .filter((s) => s);

      default:
        return value;
    }
  }

  /**
   * Apply transformation to value
   */
  private applyTransformation(
    value: string,
    transform: CsvColumnDefinition['transform'],
  ): string {
    switch (transform) {
      case 'lowercase':
        return value.toLowerCase();
      case 'uppercase':
        return value.toUpperCase();
      case 'trim':
        return value.trim();
      case 'slug':
        return value
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-');
      case 'html_strip':
        return value.replace(/<[^>]*>/g, '');
      case 'currency_parse':
        return value.replace(/[^0-9.-]/g, '');
      default:
        return value;
    }
  }

  /**
   * Parse date with specific format
   */
  private parseDate(value: string, format: string): Date {
    // Simple format parsing (supports: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, etc.)
    const parts: Record<string, number> = {};

    // Find year
    const yearMatch = format.match(/YYYY/);
    if (yearMatch) {
      const startIndex = format.indexOf('YYYY');
      parts.year = parseInt(value.substring(startIndex, startIndex + 4), 10);
    }

    // Find month
    const monthMatch = format.match(/MM/);
    if (monthMatch) {
      const startIndex = format.indexOf('MM');
      parts.month = parseInt(value.substring(startIndex, startIndex + 2), 10) - 1;
    }

    // Find day
    const dayMatch = format.match(/DD/);
    if (dayMatch) {
      const startIndex = format.indexOf('DD');
      parts.day = parseInt(value.substring(startIndex, startIndex + 2), 10);
    }

    return new Date(parts.year || 2000, parts.month || 0, parts.day || 1);
  }

  /**
   * Validate value against rule
   */
  private validateValue(value: string | undefined, rule: CsvValidationRule): string | null {
    const isEmpty = value === undefined || value === null || value === '';

    switch (rule.type) {
      case 'required':
        if (isEmpty) {
          return rule.message || 'Field is required';
        }
        break;

      case 'unique':
        // Unique validation is handled at the collection level
        break;

      case 'regex':
        if (!isEmpty && rule.value) {
          const regex = new RegExp(rule.value as string);
          if (!regex.test(value!)) {
            return rule.message || `Value does not match pattern ${rule.value}`;
          }
        }
        break;

      case 'min_length':
        if (!isEmpty && value!.length < (rule.value as number)) {
          return rule.message || `Value must be at least ${rule.value} characters`;
        }
        break;

      case 'max_length':
        if (!isEmpty && value!.length > (rule.value as number)) {
          return rule.message || `Value must be at most ${rule.value} characters`;
        }
        break;

      case 'min_value':
        if (!isEmpty) {
          const num = parseFloat(value!);
          if (isNaN(num) || num < (rule.value as number)) {
            return rule.message || `Value must be at least ${rule.value}`;
          }
        }
        break;

      case 'max_value':
        if (!isEmpty) {
          const num = parseFloat(value!);
          if (isNaN(num) || num > (rule.value as number)) {
            return rule.message || `Value must be at most ${rule.value}`;
          }
        }
        break;

      case 'enum':
        if (!isEmpty && Array.isArray(rule.value) && !rule.value.includes(value!)) {
          return rule.message || `Value must be one of: ${rule.value.join(', ')}`;
        }
        break;

      case 'url':
        if (!isEmpty) {
          try {
            new URL(value!);
          } catch {
            return rule.message || 'Invalid URL format';
          }
        }
        break;

      case 'email':
        if (!isEmpty && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value!)) {
          return rule.message || 'Invalid email format';
        }
        break;

      case 'numeric':
        if (!isEmpty && isNaN(parseFloat(value!))) {
          return rule.message || 'Value must be numeric';
        }
        break;
    }

    return null;
  }

  /**
   * Check if row is empty
   */
  private isEmptyRow(row: Record<string, string>): boolean {
    return Object.values(row).every(
      (value) => value === undefined || value === null || value.trim() === '',
    );
  }

  /**
   * Detect CSV file information
   */
  async detectFileInfo(buffer: Buffer, sampleSize: number = 5): Promise<CsvFileInfo> {
    const content = buffer.toString('utf-8');
    const lines = content.split('\n').filter((line) => line.trim());

    // Detect delimiter
    const delimiter = this.detectDelimiter(lines[0]);

    // Detect quote character
    const quote = this.detectQuote(lines[0]);

    // Parse headers
    const headers = lines[0]
      .split(delimiter)
      .map((h) => h.replace(new RegExp(`^${quote}|${quote}$`, 'g'), '').trim());

    // Get sample rows
    const sampleRows: string[][] = [];
    for (let i = 1; i < Math.min(lines.length, sampleSize + 1); i++) {
      sampleRows.push(
        lines[i]
          .split(delimiter)
          .map((v) => v.replace(new RegExp(`^${quote}|${quote}$`, 'g'), '').trim()),
      );
    }

    return {
      fileName: '',
      fileSize: buffer.length,
      mimeType: 'text/csv',
      encoding: 'utf-8',
      detectedDelimiter: delimiter,
      detectedQuote: quote,
      estimatedRows: lines.length - 1,
      headers,
      sampleRows,
    };
  }

  /**
   * Detect column types and suggest mappings
   */
  detectColumns(fileInfo: CsvFileInfo): CsvColumnDetection[] {
    const { headers, sampleRows } = fileInfo;

    if (!headers || !sampleRows) {
      return [];
    }

    return headers.map((header, index) => {
      const values = sampleRows.map((row) => row[index]).filter((v) => v !== undefined);

      return {
        columnIndex: index,
        columnName: header,
        suggestedType: this.inferType(values),
        suggestedTargetField: this.suggestTargetField(header),
        sampleValues: values.slice(0, 3),
        nullCount: sampleRows.length - values.length,
        confidence: this.calculateConfidence(header, values),
      };
    });
  }

  /**
   * Detect CSV delimiter
   */
  private detectDelimiter(line: string): string {
    const delimiters = [',', ';', '\t', '|'];
    let maxCount = 0;
    let detectedDelimiter = ',';

    for (const delimiter of delimiters) {
      const count = (line.match(new RegExp(delimiter, 'g')) || []).length;
      if (count > maxCount) {
        maxCount = count;
        detectedDelimiter = delimiter;
      }
    }

    return detectedDelimiter;
  }

  /**
   * Detect quote character
   */
  private detectQuote(line: string): string {
    if (line.includes('"')) return '"';
    if (line.includes("'")) return "'";
    return '"';
  }

  /**
   * Infer column type from sample values
   */
  private inferType(values: string[]): CsvColumnType {
    if (values.length === 0) return 'string';

    const allNumbers = values.every((v) => !isNaN(parseFloat(v.replace(/[^0-9.-]/g, ''))));
    if (allNumbers) return 'number';

    const allBooleans = values.every((v) =>
      ['true', 'false', '1', '0', 'yes', 'no'].includes(v.toLowerCase()),
    );
    if (allBooleans) return 'boolean';

    const allDates = values.every((v) => !isNaN(new Date(v).getTime()));
    if (allDates) return 'date';

    const hasCommas = values.some((v) => v.includes(','));
    if (hasCommas) return 'array';

    return 'string';
  }

  /**
   * Suggest target field based on column name
   */
  private suggestTargetField(columnName: string): string | undefined {
    const lowerName = columnName.toLowerCase().replace(/[_-]/g, '');

    const mappings: Record<string, string> = {
      id: 'externalId',
      productid: 'externalId',
      sku: 'sku',
      name: 'name',
      title: 'name',
      productname: 'name',
      description: 'description',
      desc: 'description',
      price: 'price',
      regularprice: 'price',
      saleprice: 'compareAtPrice',
      compareatprice: 'compareAtPrice',
      cost: 'costPrice',
      costprice: 'costPrice',
      currency: 'currency',
      image: 'images',
      images: 'images',
      imageurl: 'featuredImage',
      category: 'categories',
      categories: 'categories',
      tag: 'tags',
      tags: 'tags',
      quantity: 'quantity',
      stock: 'quantity',
      stockquantity: 'quantity',
      inventory: 'quantity',
      status: 'status',
      vendor: 'vendor',
      brand: 'brand',
      barcode: 'barcode',
      upc: 'barcode',
      ean: 'barcode',
      weight: 'weight',
      length: 'length',
      width: 'width',
      height: 'height',
    };

    return mappings[lowerName];
  }

  /**
   * Calculate confidence score for column mapping
   */
  private calculateConfidence(header: string, values: string[]): number {
    const suggestedField = this.suggestTargetField(header);
    if (suggestedField) {
      return 0.9;
    }

    if (values.length > 0) {
      return 0.5;
    }

    return 0.3;
  }
}
