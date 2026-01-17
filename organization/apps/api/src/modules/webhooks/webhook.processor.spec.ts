import { Test, TestingModule } from '@nestjs/testing';
import { WebhookProcessor } from './webhook.processor';
import { WebhookService } from './webhook.service';
import { HttpService } from '@nestjs/axios';
import { Job } from 'bull';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { createWebhookHeaders } from './utils/webhook-signature.util';

jest.mock('./utils/webhook-signature.util');

describe('WebhookProcessor', () => {
  let processor: WebhookProcessor;
  let webhookService: jest.Mocked<WebhookService>;
  let httpService: jest.Mocked<HttpService>;

  const mockJobData = {
    deliveryId: 'delivery_123',
    webhookId: 'webhook_123',
    url: 'https://example.com/webhook',
    secret: 'whsec_test_secret',
    eventType: 'order.created',
    eventId: 'evt_123',
    payload: { order: { id: 'order_123', total: 100 } },
    attempt: 1,
  };

  const mockJob = {
    id: 'job_123',
    data: mockJobData,
    progress: jest.fn().mockResolvedValue(undefined),
  } as unknown as Job;

  const mockHeaders = {
    'Content-Type': 'application/json',
    'User-Agent': 'Broxiva-Webhook/1.0',
    'X-Webhook-Signature': 't=1234567890,v1=signature',
    'X-Webhook-Event-Type': 'order.created',
    'X-Webhook-Event-ID': 'evt_123',
    'X-Webhook-Timestamp': '1234567890',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookProcessor,
        {
          provide: WebhookService,
          useValue: {
            handleDeliverySuccess: jest.fn(),
            handleDeliveryFailure: jest.fn(),
          },
        },
        {
          provide: HttpService,
          useValue: {
            post: jest.fn(),
          },
        },
      ],
    }).compile();

    processor = module.get<WebhookProcessor>(WebhookProcessor);
    webhookService = module.get(WebhookService) as jest.Mocked<WebhookService>;
    httpService = module.get(HttpService) as jest.Mocked<HttpService>;

    // Mock createWebhookHeaders
    (createWebhookHeaders as jest.Mock).mockReturnValue(mockHeaders);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processDelivery', () => {
    it('should successfully deliver webhook', async () => {
      const mockResponse: Partial<AxiosResponse> = {
        status: 200,
        statusText: 'OK',
        data: { success: true },
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(mockResponse as AxiosResponse));

      const result = await processor.processDelivery(mockJob);

      expect(createWebhookHeaders).toHaveBeenCalledWith(
        mockJobData.payload,
        mockJobData.secret,
        mockJobData.eventType,
        mockJobData.eventId,
      );

      expect(httpService.post).toHaveBeenCalledWith(
        mockJobData.url,
        mockJobData.payload,
        {
          headers: mockHeaders,
          timeout: 30000,
          validateStatus: expect.any(Function),
        },
      );

      expect(webhookService.handleDeliverySuccess).toHaveBeenCalledWith(
        mockJobData.deliveryId,
        200,
        expect.stringContaining('success'),
      );

      expect(result).toEqual({
        success: true,
        deliveryId: mockJobData.deliveryId,
        statusCode: 200,
        duration: expect.any(Number),
      });
    });

    it('should update job progress during delivery', async () => {
      const mockResponse: Partial<AxiosResponse> = {
        status: 200,
        data: {},
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(mockResponse as AxiosResponse));

      await processor.processDelivery(mockJob);

      expect(mockJob.progress).toHaveBeenCalledWith(10);
      expect(mockJob.progress).toHaveBeenCalledWith(30);
      expect(mockJob.progress).toHaveBeenCalledWith(80);
      expect(mockJob.progress).toHaveBeenCalledWith(100);
    });

    it('should limit response body to 1000 characters', async () => {
      const longResponse = 'a'.repeat(2000);
      const mockResponse: Partial<AxiosResponse> = {
        status: 200,
        data: { message: longResponse },
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(mockResponse as AxiosResponse));

      await processor.processDelivery(mockJob);

      expect(webhookService.handleDeliverySuccess).toHaveBeenCalledWith(
        mockJobData.deliveryId,
        200,
        expect.stringMatching(/^.{1,1000}$/),
      );
    });

    it('should handle HTTP error response', async () => {
      const error: Partial<AxiosError> = {
        message: 'Request failed',
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'Something went wrong' },
          headers: {},
          config: {} as any,
        },
      };

      httpService.post.mockReturnValue(
        throwError(() => error as AxiosError),
      );

      const result = await processor.processDelivery(mockJob);

      expect(webhookService.handleDeliveryFailure).toHaveBeenCalledWith(
        mockJobData.deliveryId,
        500,
        'HTTP 500: Internal Server Error',
        expect.stringContaining('error'),
      );

      expect(result).toEqual({
        success: false,
        deliveryId: mockJobData.deliveryId,
        statusCode: 500,
        errorMessage: 'HTTP 500: Internal Server Error',
        attempt: 1,
      });
    });

    it('should handle connection refused error', async () => {
      const error = {
        message: 'Connection refused',
        code: 'ECONNREFUSED',
      };

      httpService.post.mockReturnValue(throwError(() => error));

      const result = await processor.processDelivery(mockJob);

      expect(webhookService.handleDeliveryFailure).toHaveBeenCalledWith(
        mockJobData.deliveryId,
        null,
        'Connection refused',
        undefined,
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Connection refused');
    });

    it('should handle timeout error', async () => {
      const error = {
        message: 'Timeout error',
        code: 'ETIMEDOUT',
      };

      httpService.post.mockReturnValue(throwError(() => error));

      const result = await processor.processDelivery(mockJob);

      expect(webhookService.handleDeliveryFailure).toHaveBeenCalledWith(
        mockJobData.deliveryId,
        null,
        'Request timeout',
        undefined,
      );

      expect(result.errorMessage).toBe('Request timeout');
    });

    it('should handle host not found error', async () => {
      const error = {
        message: 'Host not found',
        code: 'ENOTFOUND',
      };

      httpService.post.mockReturnValue(throwError(() => error));

      const result = await processor.processDelivery(mockJob);

      expect(webhookService.handleDeliveryFailure).toHaveBeenCalledWith(
        mockJobData.deliveryId,
        null,
        'Host not found',
        undefined,
      );

      expect(result.errorMessage).toBe('Host not found');
    });

    it('should handle generic errors', async () => {
      const error = {
        message: 'Unknown error occurred',
      };

      httpService.post.mockReturnValue(throwError(() => error));

      const result = await processor.processDelivery(mockJob);

      expect(webhookService.handleDeliveryFailure).toHaveBeenCalledWith(
        mockJobData.deliveryId,
        null,
        'Unknown error occurred',
        undefined,
      );

      expect(result.errorMessage).toBe('Unknown error occurred');
    });

    it('should handle 4xx client errors', async () => {
      const error: Partial<AxiosError> = {
        message: 'Bad Request',
        response: {
          status: 400,
          statusText: 'Bad Request',
          data: { error: 'Invalid payload' },
          headers: {},
          config: {} as any,
        },
      };

      httpService.post.mockReturnValue(
        throwError(() => error as AxiosError),
      );

      const result = await processor.processDelivery(mockJob);

      expect(webhookService.handleDeliveryFailure).toHaveBeenCalledWith(
        mockJobData.deliveryId,
        400,
        'HTTP 400: Bad Request',
        expect.any(String),
      );

      expect(result.statusCode).toBe(400);
    });

    it('should track delivery duration', async () => {
      const mockResponse: Partial<AxiosResponse> = {
        status: 200,
        data: {},
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(mockResponse as AxiosResponse));

      const result = await processor.processDelivery(mockJob);

      expect(result.duration).toBeDefined();
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should use 30 second timeout for HTTP requests', async () => {
      const mockResponse: Partial<AxiosResponse> = {
        status: 200,
        data: {},
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(mockResponse as AxiosResponse));

      await processor.processDelivery(mockJob);

      expect(httpService.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.objectContaining({
          timeout: 30000,
        }),
      );
    });

    it('should validate status codes in range 200-299', async () => {
      const mockResponse: Partial<AxiosResponse> = {
        status: 200,
        data: {},
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(mockResponse as AxiosResponse));

      await processor.processDelivery(mockJob);

      const callArgs = httpService.post.mock.calls[0];
      const config = callArgs[2];
      const validateStatus = config?.validateStatus;

      expect(validateStatus).toBeDefined();
      expect(validateStatus!(200)).toBe(true);
      expect(validateStatus!(299)).toBe(true);
      expect(validateStatus!(300)).toBe(false);
      expect(validateStatus!(199)).toBe(false);
    });
  });

  describe('onActive', () => {
    it('should log when job becomes active', () => {
      const loggerSpy = jest.spyOn(processor['logger'], 'debug');

      processor.onActive(mockJob);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Processing webhook delivery job'),
        expect.objectContaining({
          deliveryId: mockJobData.deliveryId,
          eventType: mockJobData.eventType,
          attempt: mockJobData.attempt,
        }),
      );
    });
  });

  describe('onCompleted', () => {
    it('should log successful completion', async () => {
      const loggerSpy = jest.spyOn(processor['logger'], 'log');

      const result = {
        success: true,
        deliveryId: mockJobData.deliveryId,
        statusCode: 200,
        duration: 150,
      };

      await processor.onCompleted(mockJob, result);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('completed successfully'),
        expect.objectContaining({
          deliveryId: mockJobData.deliveryId,
          statusCode: 200,
          duration: 150,
        }),
      );
    });

    it('should log failed completion', async () => {
      const loggerSpy = jest.spyOn(processor['logger'], 'warn');

      const result = {
        success: false,
        deliveryId: mockJobData.deliveryId,
        attempt: 1,
        errorMessage: 'Connection refused',
      };

      await processor.onCompleted(mockJob, result);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('completed with failure'),
        expect.objectContaining({
          deliveryId: mockJobData.deliveryId,
          attempt: 1,
          errorMessage: 'Connection refused',
        }),
      );
    });
  });

  describe('onFailed', () => {
    it('should log job failure and call handleDeliveryFailure', async () => {
      const error = new Error('Job processing failed');
      const loggerSpy = jest.spyOn(processor['logger'], 'error');

      await processor.onFailed(mockJob, error);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('failed unexpectedly'),
        expect.objectContaining({
          deliveryId: mockJobData.deliveryId,
          eventType: mockJobData.eventType,
          url: mockJobData.url,
          error: error.message,
          stack: error.stack,
        }),
      );

      expect(webhookService.handleDeliveryFailure).toHaveBeenCalledWith(
        mockJobData.deliveryId,
        null,
        `Job processing error: ${error.message}`,
      );
    });

    it('should handle errors in failure handler gracefully', async () => {
      const error = new Error('Job processing failed');
      const handlingError = new Error('Failed to handle failure');

      webhookService.handleDeliveryFailure.mockRejectedValue(handlingError);

      const loggerSpy = jest.spyOn(processor['logger'], 'error');

      await processor.onFailed(mockJob, error);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to handle job failure'),
        handlingError,
      );
    });
  });

  describe('Multiple Attempts', () => {
    it('should process retry attempts correctly', async () => {
      const retryJob = {
        ...mockJob,
        data: {
          ...mockJobData,
          attempt: 3,
        },
      } as Job;

      const mockResponse: Partial<AxiosResponse> = {
        status: 200,
        data: {},
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(mockResponse as AxiosResponse));

      await processor.processDelivery(retryJob);

      expect(webhookService.handleDeliverySuccess).toHaveBeenCalledWith(
        mockJobData.deliveryId,
        200,
        expect.any(String),
      );
    });

    it('should log correct attempt number on failure', async () => {
      const retryJob = {
        ...mockJob,
        data: {
          ...mockJobData,
          attempt: 5,
        },
      } as Job;

      const error = {
        message: 'Connection refused',
        code: 'ECONNREFUSED',
      };

      httpService.post.mockReturnValue(throwError(() => error));

      const loggerSpy = jest.spyOn(processor['logger'], 'error');

      await processor.processDelivery(retryJob);

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('attempt 5'),
      );
    });
  });

  describe('Response Handling', () => {
    it('should handle empty response body', async () => {
      const mockResponse: Partial<AxiosResponse> = {
        status: 204,
        data: null,
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(mockResponse as AxiosResponse));

      await processor.processDelivery(mockJob);

      expect(webhookService.handleDeliverySuccess).toHaveBeenCalledWith(
        mockJobData.deliveryId,
        204,
        expect.any(String),
      );
    });

    it('should handle non-JSON response body', async () => {
      const mockResponse: Partial<AxiosResponse> = {
        status: 200,
        data: 'Plain text response',
        headers: {},
        config: {} as any,
      };

      httpService.post.mockReturnValue(of(mockResponse as AxiosResponse));

      await processor.processDelivery(mockJob);

      expect(webhookService.handleDeliverySuccess).toHaveBeenCalledWith(
        mockJobData.deliveryId,
        200,
        expect.stringContaining('Plain text response'),
      );
    });
  });
});
