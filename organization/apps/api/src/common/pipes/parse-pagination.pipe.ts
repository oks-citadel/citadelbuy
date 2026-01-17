import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';

/**
 * Parsed pagination parameters
 */
export interface ParsedPagination {
  page: number;
  limit: number;
  offset: number;
}

/**
 * Pagination pipe options
 */
export interface PaginationPipeOptions {
  /**
   * Default page number
   * @default 1
   */
  defaultPage?: number;

  /**
   * Default items per page
   * @default 20
   */
  defaultLimit?: number;

  /**
   * Maximum items per page
   * @default 100
   */
  maxLimit?: number;

  /**
   * Minimum items per page
   * @default 1
   */
  minLimit?: number;
}

/**
 * Pagination Query Pipe
 *
 * Transforms and validates pagination query parameters.
 * Ensures page and limit are within acceptable bounds.
 *
 * Usage:
 * ```typescript
 * @Get()
 * async findAll(
 *   @Query(new ParsePaginationPipe({ maxLimit: 50 })) pagination: ParsedPagination
 * ) {
 *   return this.service.findAll(pagination.page, pagination.limit);
 * }
 * ```
 */
@Injectable()
export class ParsePaginationPipe implements PipeTransform<any, ParsedPagination> {
  private readonly options: Required<PaginationPipeOptions>;

  constructor(options: PaginationPipeOptions = {}) {
    this.options = {
      defaultPage: options.defaultPage ?? 1,
      defaultLimit: options.defaultLimit ?? 20,
      maxLimit: options.maxLimit ?? 100,
      minLimit: options.minLimit ?? 1,
    };
  }

  transform(value: any, metadata: ArgumentMetadata): ParsedPagination {
    if (typeof value !== 'object' || value === null) {
      return {
        page: this.options.defaultPage,
        limit: this.options.defaultLimit,
        offset: 0,
      };
    }

    // Parse page
    let page = this.options.defaultPage;
    if (value.page !== undefined) {
      const parsedPage = parseInt(value.page, 10);
      if (isNaN(parsedPage) || parsedPage < 1) {
        throw new BadRequestException('Page must be a positive integer');
      }
      page = parsedPage;
    }

    // Parse limit
    let limit = this.options.defaultLimit;
    if (value.limit !== undefined) {
      const parsedLimit = parseInt(value.limit, 10);
      if (isNaN(parsedLimit)) {
        throw new BadRequestException('Limit must be a number');
      }
      if (parsedLimit < this.options.minLimit) {
        throw new BadRequestException(
          `Limit must be at least ${this.options.minLimit}`,
        );
      }
      if (parsedLimit > this.options.maxLimit) {
        throw new BadRequestException(
          `Limit cannot exceed ${this.options.maxLimit}`,
        );
      }
      limit = parsedLimit;
    }

    // Calculate offset
    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }
}

/**
 * Factory function for creating a pagination pipe with custom options
 */
export function createPaginationPipe(options?: PaginationPipeOptions): ParsePaginationPipe {
  return new ParsePaginationPipe(options);
}
