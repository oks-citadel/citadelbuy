import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../services/audit.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    // Only audit mutations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const startTime = Date.now();
    const user = request.user;
    const organizationId = this.extractOrganizationId(request);

    return next.handle().pipe(
      tap({
        next: (response) => {
          // Log successful mutations
          if (organizationId && user) {
            this.auditService.log({
              organizationId,
              userId: user.id,
              action: this.getAction(method, request.route?.path),
              resource: this.getResource(request.route?.path),
              resourceId: request.params?.id,
              newValue: this.sanitizeBody(request.body),
              metadata: {
                responseTime: Date.now() - startTime,
                statusCode: 200,
              },
              ipAddress: this.getClientIp(request),
              userAgent: request.headers['user-agent'],
            });
          }
        },
        error: (error) => {
          // Log failed mutations
          if (organizationId && user) {
            this.auditService.log({
              organizationId,
              userId: user.id,
              action: this.getAction(method, request.route?.path) + '.failed',
              resource: this.getResource(request.route?.path),
              resourceId: request.params?.id,
              metadata: {
                error: error.message,
                responseTime: Date.now() - startTime,
                statusCode: error.status,
              },
              ipAddress: this.getClientIp(request),
              userAgent: request.headers['user-agent'],
            });
          }
        },
      }),
    );
  }

  private extractOrganizationId(request: any): string | null {
    const paramNames = ['orgId', 'organizationId'];
    for (const name of paramNames) {
      if (request.params?.[name]) {
        return request.params[name];
      }
    }
    if (request.organization?.id) {
      return request.organization.id;
    }
    return null;
  }

  private getAction(method: string, path: string): string {
    const resource = this.getResource(path);
    const actionMap: Record<string, string> = {
      POST: `${resource}.created`,
      PUT: `${resource}.updated`,
      PATCH: `${resource}.updated`,
      DELETE: `${resource}.deleted`,
    };
    return actionMap[method] || `${resource}.${method.toLowerCase()}`;
  }

  private getResource(path: string): string {
    if (!path) return 'unknown';

    // Extract resource from path
    // e.g., /organizations/:orgId/members -> member
    const parts = path.split('/').filter(Boolean);
    const resourcePart = parts[parts.length - 1];

    // Remove params
    if (resourcePart.startsWith(':')) {
      return parts[parts.length - 2] || 'unknown';
    }

    // Singularize
    if (resourcePart.endsWith('s')) {
      return resourcePart.slice(0, -1);
    }

    return resourcePart;
  }

  private sanitizeBody(body: any): any {
    if (!body) return null;

    // Remove sensitive fields
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'accountNumber'];

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private getClientIp(request: any): string {
    return (
      request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.ip
    );
  }
}
