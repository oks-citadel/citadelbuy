export { ObservabilityModule } from './observability.module';

// Re-export commonly used types and utilities
export {
  CorrelationContext,
  RequestWithCorrelation,
  getCurrentCorrelationContext,
  getCurrentCorrelationId,
  getCurrentRequestId,
} from '../middleware/correlation-id.middleware';

export { CustomLoggerService, LogLevel } from '../logger';
export { MetricsService } from '../monitoring';
