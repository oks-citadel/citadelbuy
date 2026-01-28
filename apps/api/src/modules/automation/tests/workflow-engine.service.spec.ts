import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkflowEngineService } from '../workflow-engine.service';
import { PrismaService } from '../../../common/prisma/prisma.service';

describe('WorkflowEngineService', () => {
  let service: WorkflowEngineService;
  let eventEmitter: EventEmitter2;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowEngineService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<WorkflowEngineService>(WorkflowEngineService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('defineWorkflow', () => {
    it('should define a new workflow', async () => {
      const workflow = await service.defineWorkflow({
        name: 'test-workflow',
        entityType: 'test',
        initialState: 'pending',
        states: ['pending', 'active', 'completed'],
        transitions: [
          { from: 'pending', to: 'active', event: 'activate' },
          { from: 'active', to: 'completed', event: 'complete' },
        ],
      });

      expect(workflow).toBeDefined();
      expect(workflow.name).toBe('test-workflow');
      expect(workflow.states).toHaveLength(3);
      expect(workflow.transitions).toHaveLength(2);
    });

    it('should emit workflow.defined event', async () => {
      await service.defineWorkflow({
        name: 'test-workflow',
        entityType: 'test',
        initialState: 'pending',
        states: ['pending', 'active'],
        transitions: [{ from: 'pending', to: 'active', event: 'activate' }],
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'workflow.defined',
        expect.objectContaining({
          workflow: expect.any(Object),
          timestamp: expect.any(Date),
        }),
      );
    });

    it('should throw error if workflow definition is invalid', async () => {
      await expect(
        service.defineWorkflow({
          name: '',
          entityType: 'test',
          initialState: 'pending',
          states: ['pending'],
          transitions: [],
        }),
      ).rejects.toThrow('Workflow name is required');
    });

    it('should throw error if initial state is not in states list', async () => {
      await expect(
        service.defineWorkflow({
          name: 'test-workflow',
          entityType: 'test',
          initialState: 'invalid',
          states: ['pending', 'active'],
          transitions: [],
        }),
      ).rejects.toThrow('Initial state must be in states list');
    });
  });

  describe('createInstance', () => {
    beforeEach(async () => {
      await service.defineWorkflow({
        name: 'order-workflow',
        entityType: 'order',
        initialState: 'pending',
        states: ['pending', 'processing', 'completed'],
        transitions: [
          { from: 'pending', to: 'processing', event: 'process' },
          { from: 'processing', to: 'completed', event: 'complete' },
        ],
      });
    });

    it('should create a new workflow instance', async () => {
      const instance = await service.createInstance(
        'order-workflow',
        'order-123',
        { customerId: 'user-456' },
        'user-456',
      );

      expect(instance).toBeDefined();
      expect(instance.workflowName).toBe('order-workflow');
      expect(instance.entityId).toBe('order-123');
      expect(instance.currentState).toBe('pending');
      expect(instance.history).toHaveLength(1);
    });

    it('should emit instance.created event', async () => {
      await service.createInstance('order-workflow', 'order-123');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'workflow.instance.created',
        expect.objectContaining({
          instance: expect.any(Object),
          timestamp: expect.any(Date),
        }),
      );
    });

    it('should throw error if workflow does not exist', async () => {
      await expect(
        service.createInstance('non-existent', 'order-123'),
      ).rejects.toThrow("Workflow 'non-existent' not found");
    });

    it('should not create duplicate instances', async () => {
      const instance1 = await service.createInstance('order-workflow', 'order-123');
      const instance2 = await service.createInstance('order-workflow', 'order-123');

      expect(instance1.id).toBe(instance2.id);
    });
  });

  describe('transition', () => {
    beforeEach(async () => {
      await service.defineWorkflow({
        name: 'order-workflow',
        entityType: 'order',
        initialState: 'pending',
        states: ['pending', 'processing', 'completed', 'cancelled'],
        transitions: [
          { from: 'pending', to: 'processing', event: 'process' },
          { from: 'processing', to: 'completed', event: 'complete' },
          { from: ['pending', 'processing'], to: 'cancelled', event: 'cancel' },
        ],
      });

      await service.createInstance('order-workflow', 'order-123');
    });

    it('should execute a valid transition', async () => {
      const instance = await service.transition(
        'order-workflow',
        'order-123',
        'process',
      );

      expect(instance.currentState).toBe('processing');
      expect(instance.history).toHaveLength(2);
    });

    it('should emit workflow.transition event', async () => {
      await service.transition('order-workflow', 'order-123', 'process');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'workflow.transition',
        expect.objectContaining({
          instance: expect.any(Object),
          transition: expect.objectContaining({
            from: 'pending',
            to: 'processing',
            event: 'process',
          }),
        }),
      );
    });

    it('should emit state-specific event', async () => {
      await service.transition('order-workflow', 'order-123', 'process');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'workflow.order-workflow.processing',
        expect.any(Object),
      );
    });

    it('should throw error for invalid transition', async () => {
      await expect(
        service.transition('order-workflow', 'order-123', 'complete'),
      ).rejects.toThrow(
        "No transition found for event 'complete' from state 'pending'",
      );
    });

    it('should support transitions from multiple states', async () => {
      // Cancel from pending state
      const instance1 = await service.transition(
        'order-workflow',
        'order-123',
        'cancel',
      );
      expect(instance1.currentState).toBe('cancelled');

      // Create new instance and transition to processing
      await service.createInstance('order-workflow', 'order-456');
      await service.transition('order-workflow', 'order-456', 'process');

      // Cancel from processing state
      const instance2 = await service.transition(
        'order-workflow',
        'order-456',
        'cancel',
      );
      expect(instance2.currentState).toBe('cancelled');
    });

    it('should execute guards before transition', async () => {
      const guardMock = jest.fn().mockResolvedValue(false);

      await service.defineWorkflow({
        name: 'guarded-workflow',
        entityType: 'test',
        initialState: 'pending',
        states: ['pending', 'active'],
        transitions: [
          {
            from: 'pending',
            to: 'active',
            event: 'activate',
            guards: [guardMock],
          },
        ],
      });

      await service.createInstance('guarded-workflow', 'test-123');

      await expect(
        service.transition('guarded-workflow', 'test-123', 'activate'),
      ).rejects.toThrow('Transition guards failed');

      expect(guardMock).toHaveBeenCalled();
    });

    it('should execute hooks on transition', async () => {
      const beforeHook = jest.fn();
      const afterHook = jest.fn();

      await service.defineWorkflow({
        name: 'hooked-workflow',
        entityType: 'test',
        initialState: 'pending',
        states: ['pending', 'active'],
        transitions: [
          {
            from: 'pending',
            to: 'active',
            event: 'activate',
            hooks: {
              before: [beforeHook],
              after: [afterHook],
            },
          },
        ],
      });

      await service.createInstance('hooked-workflow', 'test-123');
      await service.transition('hooked-workflow', 'test-123', 'activate');

      expect(beforeHook).toHaveBeenCalled();
      expect(afterHook).toHaveBeenCalled();
    });

    it('should force transition when force flag is set', async () => {
      const guardMock = jest.fn().mockResolvedValue(false);

      await service.defineWorkflow({
        name: 'guarded-workflow',
        entityType: 'test',
        initialState: 'pending',
        states: ['pending', 'active'],
        transitions: [
          {
            from: 'pending',
            to: 'active',
            event: 'activate',
            guards: [guardMock],
          },
        ],
      });

      await service.createInstance('guarded-workflow', 'test-123');

      const instance = await service.transition(
        'guarded-workflow',
        'test-123',
        'activate',
        { force: true },
      );

      expect(instance.currentState).toBe('active');
      expect(guardMock).not.toHaveBeenCalled();
    });
  });

  describe('canTransition', () => {
    beforeEach(async () => {
      await service.defineWorkflow({
        name: 'order-workflow',
        entityType: 'order',
        initialState: 'pending',
        states: ['pending', 'processing'],
        transitions: [{ from: 'pending', to: 'processing', event: 'process' }],
      });

      await service.createInstance('order-workflow', 'order-123');
    });

    it('should return true for valid transition', async () => {
      const canTransition = await service.canTransition(
        'order-workflow',
        'order-123',
        'process',
      );

      expect(canTransition).toBe(true);
    });

    it('should return false for invalid transition', async () => {
      const canTransition = await service.canTransition(
        'order-workflow',
        'order-123',
        'invalid',
      );

      expect(canTransition).toBe(false);
    });

    it('should check guards', async () => {
      const guardMock = jest.fn().mockResolvedValue(false);

      await service.defineWorkflow({
        name: 'guarded-workflow',
        entityType: 'test',
        initialState: 'pending',
        states: ['pending', 'active'],
        transitions: [
          {
            from: 'pending',
            to: 'active',
            event: 'activate',
            guards: [guardMock],
          },
        ],
      });

      await service.createInstance('guarded-workflow', 'test-123');

      const canTransition = await service.canTransition(
        'guarded-workflow',
        'test-123',
        'activate',
      );

      expect(canTransition).toBe(false);
      expect(guardMock).toHaveBeenCalled();
    });
  });

  describe('getAvailableTransitions', () => {
    beforeEach(async () => {
      await service.defineWorkflow({
        name: 'order-workflow',
        entityType: 'order',
        initialState: 'pending',
        states: ['pending', 'processing', 'completed', 'cancelled'],
        transitions: [
          { from: 'pending', to: 'processing', event: 'process' },
          { from: 'pending', to: 'cancelled', event: 'cancel' },
          { from: 'processing', to: 'completed', event: 'complete' },
        ],
      });

      await service.createInstance('order-workflow', 'order-123');
    });

    it('should return available transitions for current state', () => {
      const transitions = service.getAvailableTransitions(
        'order-workflow',
        'order-123',
      );

      expect(transitions).toHaveLength(2);
      expect(transitions.map((t) => t.event)).toContain('process');
      expect(transitions.map((t) => t.event)).toContain('cancel');
    });

    it('should return different transitions after state change', async () => {
      await service.transition('order-workflow', 'order-123', 'process');

      const transitions = service.getAvailableTransitions(
        'order-workflow',
        'order-123',
      );

      expect(transitions).toHaveLength(1);
      expect(transitions[0].event).toBe('complete');
    });
  });

  describe('getHistory', () => {
    beforeEach(async () => {
      await service.defineWorkflow({
        name: 'order-workflow',
        entityType: 'order',
        initialState: 'pending',
        states: ['pending', 'processing', 'completed'],
        transitions: [
          { from: 'pending', to: 'processing', event: 'process' },
          { from: 'processing', to: 'completed', event: 'complete' },
        ],
      });

      await service.createInstance('order-workflow', 'order-123');
    });

    it('should return complete history', async () => {
      await service.transition('order-workflow', 'order-123', 'process');
      await service.transition('order-workflow', 'order-123', 'complete');

      const history = service.getHistory('order-workflow', 'order-123');

      expect(history).toHaveLength(3); // init, process, complete
      expect(history[0].event).toBe('init');
      expect(history[1].event).toBe('process');
      expect(history[2].event).toBe('complete');
    });
  });

  describe('resetInstance', () => {
    beforeEach(async () => {
      await service.defineWorkflow({
        name: 'order-workflow',
        entityType: 'order',
        initialState: 'pending',
        states: ['pending', 'processing'],
        transitions: [{ from: 'pending', to: 'processing', event: 'process' }],
      });

      await service.createInstance('order-workflow', 'order-123');
    });

    it('should reset instance to initial state', async () => {
      await service.transition('order-workflow', 'order-123', 'process');

      const instance = await service.resetInstance('order-workflow', 'order-123');

      expect(instance.currentState).toBe('pending');
      expect(instance.history.length).toBeGreaterThan(2);
      expect(instance.history[instance.history.length - 1].event).toBe('reset');
    });

    it('should emit reset event', async () => {
      await service.resetInstance('order-workflow', 'order-123');

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'workflow.instance.reset',
        expect.any(Object),
      );
    });
  });

  describe('getWorkflowStats', () => {
    beforeEach(async () => {
      await service.defineWorkflow({
        name: 'order-workflow',
        entityType: 'order',
        initialState: 'pending',
        states: ['pending', 'processing', 'completed'],
        transitions: [
          { from: 'pending', to: 'processing', event: 'process' },
          { from: 'processing', to: 'completed', event: 'complete' },
        ],
      });

      await service.createInstance('order-workflow', 'order-1');
      await service.createInstance('order-workflow', 'order-2');
      await service.transition('order-workflow', 'order-2', 'process');
      await service.createInstance('order-workflow', 'order-3');
    });

    it('should return workflow statistics', () => {
      const stats = service.getWorkflowStats('order-workflow');

      expect(stats).toBeDefined();
      expect(stats?.totalInstances).toBe(3);
      expect(stats?.stateDistribution).toEqual({
        pending: 2,
        processing: 1,
      });
    });

    it('should return null for non-existent workflow', () => {
      const stats = service.getWorkflowStats('non-existent');

      expect(stats).toBeNull();
    });
  });
});
