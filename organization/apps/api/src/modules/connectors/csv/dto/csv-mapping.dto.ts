/**
 * CSV Mapping DTOs
 *
 * DTOs for configuring CSV file parsing and field mapping.
 */

/**
 * CSV column type
 */
export type CsvColumnType = 'string' | 'number' | 'boolean' | 'date' | 'json' | 'array';

/**
 * CSV column definition
 */
export interface CsvColumnDefinition {
  /** Column index (0-based) or column name */
  column: number | string;
  /** Target field in normalized product */
  targetField: string;
  /** Data type */
  type: CsvColumnType;
  /** Whether field is required */
  required?: boolean;
  /** Default value if column is empty */
  defaultValue?: any;
  /** Array delimiter (for type: 'array') */
  arrayDelimiter?: string;
  /** Date format (for type: 'date') */
  dateFormat?: string;
  /** Decimal separator (for type: 'number') */
  decimalSeparator?: string;
  /** Transformation function name */
  transform?: 'lowercase' | 'uppercase' | 'trim' | 'slug' | 'html_strip' | 'currency_parse';
  /** Validation pattern (regex) */
  validationPattern?: string;
  /** Custom validation error message */
  validationMessage?: string;
}

/**
 * CSV validation rule types
 */
export type CsvValidationRuleType =
  | 'required'
  | 'unique'
  | 'regex'
  | 'min_length'
  | 'max_length'
  | 'min_value'
  | 'max_value'
  | 'enum'
  | 'url'
  | 'email'
  | 'numeric';

/**
 * CSV validation rule
 */
export interface CsvValidationRule {
  column: number | string;
  type: CsvValidationRuleType;
  value?: any;
  message?: string;
}

/**
 * CSV import options
 */
export interface CsvImportOptions {
  /** Field delimiter */
  delimiter: string;
  /** Quote character */
  quote: string;
  /** Escape character */
  escape: string;
  /** Whether first row is header */
  hasHeader: boolean;
  /** Number of rows to skip at start */
  skipRows: number;
  /** File encoding */
  encoding: BufferEncoding;
  /** Trim whitespace from values */
  trimValues: boolean;
  /** Skip empty rows */
  skipEmptyRows: boolean;
  /** Maximum rows to process (0 = unlimited) */
  maxRows: number;
  /** Comment character (lines starting with this are skipped) */
  commentChar?: string;
  /** How to handle null/empty values */
  emptyValueHandling: 'keep' | 'null' | 'default';
}

/**
 * CSV field mapping configuration
 */
export interface CsvFieldMapping {
  /** External ID column (required) */
  externalId: CsvColumnDefinition;
  /** SKU column */
  sku?: CsvColumnDefinition;
  /** Product name column (required) */
  name: CsvColumnDefinition;
  /** Description column */
  description?: CsvColumnDefinition;
  /** Short description column */
  shortDescription?: CsvColumnDefinition;
  /** Price column (required) */
  price: CsvColumnDefinition;
  /** Compare at price column */
  compareAtPrice?: CsvColumnDefinition;
  /** Cost price column */
  costPrice?: CsvColumnDefinition;
  /** Currency column */
  currency?: CsvColumnDefinition;
  /** Images column (comma-separated URLs) */
  images?: CsvColumnDefinition;
  /** Featured image column */
  featuredImage?: CsvColumnDefinition;
  /** Categories column (comma-separated) */
  categories?: CsvColumnDefinition;
  /** Tags column (comma-separated) */
  tags?: CsvColumnDefinition;
  /** Quantity column */
  quantity?: CsvColumnDefinition;
  /** Track inventory column */
  trackInventory?: CsvColumnDefinition;
  /** Status column */
  status?: CsvColumnDefinition;
  /** Vendor column */
  vendor?: CsvColumnDefinition;
  /** Brand column */
  brand?: CsvColumnDefinition;
  /** Barcode column */
  barcode?: CsvColumnDefinition;
  /** Weight column */
  weight?: CsvColumnDefinition;
  /** Length column */
  length?: CsvColumnDefinition;
  /** Width column */
  width?: CsvColumnDefinition;
  /** Height column */
  height?: CsvColumnDefinition;
  /** Custom metadata fields */
  metadata?: Record<string, CsvColumnDefinition>;
  /** Status value mapping */
  statusMapping?: Record<string, 'active' | 'draft' | 'archived' | 'inactive'>;
}

/**
 * CSV parsing result for a single row
 */
export interface CsvRowResult {
  rowNumber: number;
  success: boolean;
  data?: Record<string, any>;
  errors?: {
    column: string;
    message: string;
  }[];
  warnings?: {
    column: string;
    message: string;
  }[];
}

/**
 * CSV file parsing result
 */
export interface CsvParseResult {
  success: boolean;
  totalRows: number;
  successfulRows: number;
  failedRows: number;
  rows: CsvRowResult[];
  headers?: string[];
  errors: {
    rowNumber?: number;
    column?: string;
    message: string;
  }[];
  warnings: {
    rowNumber?: number;
    column?: string;
    message: string;
  }[];
}

/**
 * CSV file info
 */
export interface CsvFileInfo {
  fileName: string;
  fileSize: number;
  mimeType: string;
  encoding: string;
  detectedDelimiter?: string;
  detectedQuote?: string;
  estimatedRows?: number;
  headers?: string[];
  sampleRows?: string[][];
}

/**
 * CSV import job
 */
export interface CsvImportJob {
  id: string;
  connectorId: string;
  tenantId: string;
  fileName: string;
  filePath: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  totalRows: number;
  processedRows: number;
  successfulRows: number;
  failedRows: number;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  resultFileUrl?: string;
}

/**
 * CSV column auto-detection result
 */
export interface CsvColumnDetection {
  columnIndex: number;
  columnName: string;
  suggestedType: CsvColumnType;
  suggestedTargetField?: string;
  sampleValues: any[];
  uniqueValues?: number;
  nullCount: number;
  confidence: number;
}

/**
 * CSV import preview
 */
export interface CsvImportPreview {
  fileInfo: CsvFileInfo;
  columnDetections: CsvColumnDetection[];
  suggestedMapping: Partial<CsvFieldMapping>;
  previewProducts: any[];
  validationWarnings: string[];
}
