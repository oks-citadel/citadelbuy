import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { EventsService } from './events.service';
import {
  IngestEventDto,
  BatchIngestEventsDto,
  ValidateEventDto,
  EventQueryDto,
  BatchIngestResultDto,
  IngestResultDto,
  EventSchemaResponseDto,
} from './dto/event.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '@/common/guards/optional-jwt-auth.guard';

@ApiTags('Marketing Analytics - Events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post('ingest')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ingest a single analytics event',
    description: `
      Ingests a single analytics event with idempotency support.

      The eventId must be unique - duplicate events will be acknowledged
      but not re-processed (idempotent operation).

      Events are queued for async processing and stored in PostgreSQL.
    `,
  })
  @ApiBody({ type: IngestEventDto })
  @ApiResponse({
    status: 200,
    description: 'Event ingested successfully',
    type: IngestResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid event payload',
  })
  async ingestEvent(@Body() event: IngestEventDto): Promise<IngestResultDto> {
    return this.eventsService.ingestEvent(event);
  }

  @Post('batch')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Batch ingest multiple analytics events',
    description: `
      Ingests up to 1000 events in a single request.

      Each event must have a unique eventId for idempotency.
      Duplicate events are skipped but counted in the response.

      Use continueOnError=true (default) to process remaining events
      even if some fail validation.
    `,
  })
  @ApiBody({ type: BatchIngestEventsDto })
  @ApiResponse({
    status: 200,
    description: 'Batch ingestion completed',
    type: BatchIngestResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request payload',
  })
  async batchIngestEvents(@Body() batch: BatchIngestEventsDto): Promise<BatchIngestResultDto> {
    return this.eventsService.batchIngestEvents(batch);
  }

  @Get('schema')
  @ApiOperation({
    summary: 'Get event schema definitions',
    description: `
      Returns schema definitions for all supported event types.

      Each schema includes:
      - Required and optional properties
      - Property types
      - Default sampling rate
      - Event category
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Event schemas retrieved',
    type: [EventSchemaResponseDto],
  })
  getEventSchemas(): EventSchemaResponseDto[] {
    return this.eventsService.getEventSchemas();
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate an event payload',
    description: `
      Validates an event payload against its schema without ingesting it.

      Useful for testing event payloads before sending them.
      Returns validation errors and warnings.
    `,
  })
  @ApiBody({ type: ValidateEventDto })
  @ApiResponse({
    status: 200,
    description: 'Validation result',
  })
  validateEvent(
    @Body() event: ValidateEventDto,
  ): { valid: boolean; errors: string[]; warnings: string[] } {
    return this.eventsService.validateEvent(event);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Query events (Admin only)',
    description: `
      Query stored events with filtering and pagination.

      This endpoint is for debugging and administrative purposes.
      For analytics, use the dedicated analytics endpoints.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Events retrieved',
  })
  async queryEvents(@Query() query: EventQueryDto) {
    return this.eventsService.queryEvents(query);
  }
}
