import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import {
  ILifecycleService,
  EmailList,
  CreateListInput,
  Subscriber,
  AddSubscriberInput,
  SubscriberQuery,
  PaginatedSubscribers,
  Segment,
  CreateSegmentInput,
  SegmentEvaluation,
  BehavioralTrigger,
  CreateTriggerInput,
  NurtureFlow,
  CreateFlowInput,
  FlowEnrollment,
  LifecycleEvent,
  TrackEventInput,
  EventQueryOptions,
  UserLifecycle,
  LifecycleStage,
  LifecycleMetrics,
} from './interfaces/lifecycle.interface';

@Injectable()
export class LifecycleService implements ILifecycleService {
  private readonly logger = new Logger(LifecycleService.name);

  // In-memory storage for demo
  private lists: Map<string, EmailList> = new Map();
  private subscribers: Map<string, Subscriber[]> = new Map();
  private segments: Map<string, Segment> = new Map();
  private triggers: Map<string, BehavioralTrigger> = new Map();
  private flows: Map<string, NurtureFlow> = new Map();
  private enrollments: Map<string, FlowEnrollment[]> = new Map();
  private events: Map<string, LifecycleEvent[]> = new Map();
  private lifecycles: Map<string, UserLifecycle> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  // Email Lists
  async createList(data: CreateListInput): Promise<EmailList> {
    this.logger.log(`Creating email list: ${data.name}`);

    const id = `list-${Date.now()}`;
    const now = new Date();

    const list: EmailList = {
      id,
      name: data.name,
      description: data.description,
      organizationId: data.organizationId,
      type: data.type || 'marketing',
      doubleOptIn: data.doubleOptIn || false,
      subscriberCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    this.lists.set(id, list);
    this.subscribers.set(id, []);
    return list;
  }

  async getLists(organizationId: string): Promise<EmailList[]> {
    return Array.from(this.lists.values()).filter((l) => l.organizationId === organizationId);
  }

  async addSubscriber(listId: string, data: AddSubscriberInput): Promise<Subscriber> {
    const list = this.lists.get(listId);
    if (!list) {
      throw new NotFoundException(`List ${listId} not found`);
    }

    const id = `sub-${Date.now()}`;
    const subscriber: Subscriber = {
      id,
      listId,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      customFields: data.customFields || {},
      tags: data.tags || [],
      status: list.doubleOptIn ? 'pending' : 'subscribed',
      subscribedAt: new Date(),
    };

    const listSubscribers = this.subscribers.get(listId) || [];
    listSubscribers.push(subscriber);
    this.subscribers.set(listId, listSubscribers);

    list.subscriberCount++;
    this.lists.set(listId, list);

    return subscriber;
  }

  async removeSubscriber(listId: string, email: string): Promise<void> {
    const listSubscribers = this.subscribers.get(listId) || [];
    const updated = listSubscribers.filter((s) => s.email !== email);
    this.subscribers.set(listId, updated);

    const list = this.lists.get(listId);
    if (list) {
      list.subscriberCount = updated.length;
      this.lists.set(listId, list);
    }
  }

  async getSubscribers(listId: string, query?: SubscriberQuery): Promise<PaginatedSubscribers> {
    let items = this.subscribers.get(listId) || [];

    if (query?.status) {
      items = items.filter((s) => s.status === query.status);
    }
    if (query?.tags?.length) {
      items = items.filter((s) => query.tags!.some((tag) => s.tags.includes(tag)));
    }

    const page = query?.page || 1;
    const limit = query?.limit || 50;
    const total = items.length;

    items = items.slice((page - 1) * limit, page * limit);

    return { items, total, page, limit };
  }

  // Segments
  async createSegment(data: CreateSegmentInput): Promise<Segment> {
    this.logger.log(`Creating segment: ${data.name}`);

    const id = `seg-${Date.now()}`;

    const segment: Segment = {
      id,
      name: data.name,
      description: data.description,
      organizationId: data.organizationId,
      conditions: data.conditions,
      conditionLogic: data.conditionLogic || 'AND',
      memberCount: 0,
      createdAt: new Date(),
    };

    this.segments.set(id, segment);
    return segment;
  }

  async getSegments(organizationId: string): Promise<Segment[]> {
    return Array.from(this.segments.values()).filter((s) => s.organizationId === organizationId);
  }

  async evaluateSegment(segmentId: string): Promise<SegmentEvaluation> {
    const segment = this.segments.get(segmentId);
    if (!segment) {
      throw new NotFoundException(`Segment ${segmentId} not found`);
    }

    // Mock evaluation
    const memberCount = Math.floor(Math.random() * 1000);
    segment.memberCount = memberCount;
    segment.lastEvaluated = new Date();
    this.segments.set(segmentId, segment);

    return {
      segmentId,
      memberCount,
      sampleMembers: ['user-1', 'user-2', 'user-3'].slice(0, Math.min(3, memberCount)),
      evaluatedAt: new Date(),
    };
  }

  // Behavioral Triggers
  async createTrigger(data: CreateTriggerInput): Promise<BehavioralTrigger> {
    this.logger.log(`Creating trigger: ${data.name}`);

    const id = `trigger-${Date.now()}`;

    const trigger: BehavioralTrigger = {
      id,
      name: data.name,
      organizationId: data.organizationId,
      triggerType: data.triggerType,
      conditions: data.conditions,
      actions: data.actions,
      isActive: data.isActive !== false,
      timesTriggered: 0,
      createdAt: new Date(),
    };

    this.triggers.set(id, trigger);
    return trigger;
  }

  async getTriggers(organizationId: string): Promise<BehavioralTrigger[]> {
    return Array.from(this.triggers.values()).filter((t) => t.organizationId === organizationId);
  }

  async updateTrigger(id: string, data: Partial<CreateTriggerInput>): Promise<BehavioralTrigger> {
    const trigger = this.triggers.get(id);
    if (!trigger) {
      throw new NotFoundException(`Trigger ${id} not found`);
    }

    const updated: BehavioralTrigger = { ...trigger, ...data };
    this.triggers.set(id, updated);
    return updated;
  }

  async fireTrigger(triggerId: string, userId: string, context?: Record<string, any>): Promise<void> {
    this.logger.log(`Firing trigger ${triggerId} for user ${userId}`);

    const trigger = this.triggers.get(triggerId);
    if (trigger && trigger.isActive) {
      trigger.timesTriggered++;
      this.triggers.set(triggerId, trigger);

      // In production, execute the actions
      for (const action of trigger.actions) {
        this.logger.log(`Executing action ${action.type} for user ${userId}`);
      }
    }
  }

  // Drip/Nurture Flows
  async createFlow(data: CreateFlowInput): Promise<NurtureFlow> {
    this.logger.log(`Creating flow: ${data.name}`);

    const id = `flow-${Date.now()}`;

    const flow: NurtureFlow = {
      id,
      name: data.name,
      description: data.description,
      organizationId: data.organizationId,
      entryTrigger: data.entryTrigger,
      entryConditions: data.entryConditions,
      steps: data.steps.map((step, index) => ({
        id: `step-${Date.now()}-${index}`,
        ...step,
        order: index,
      })),
      exitConditions: data.exitConditions,
      isActive: true,
      enrolledCount: 0,
      completedCount: 0,
      createdAt: new Date(),
    };

    this.flows.set(id, flow);
    this.enrollments.set(id, []);
    return flow;
  }

  async getFlows(organizationId: string): Promise<NurtureFlow[]> {
    return Array.from(this.flows.values()).filter((f) => f.organizationId === organizationId);
  }

  async enrollInFlow(flowId: string, userId: string): Promise<FlowEnrollment> {
    const flow = this.flows.get(flowId);
    if (!flow) {
      throw new NotFoundException(`Flow ${flowId} not found`);
    }

    const enrollment: FlowEnrollment = {
      id: `enroll-${Date.now()}`,
      flowId,
      userId,
      currentStep: 0,
      status: 'active',
      enrolledAt: new Date(),
    };

    const flowEnrollments = this.enrollments.get(flowId) || [];
    flowEnrollments.push(enrollment);
    this.enrollments.set(flowId, flowEnrollments);

    flow.enrolledCount++;
    this.flows.set(flowId, flow);

    return enrollment;
  }

  async getEnrollmentStatus(flowId: string, userId: string): Promise<FlowEnrollment | null> {
    const flowEnrollments = this.enrollments.get(flowId) || [];
    return flowEnrollments.find((e) => e.userId === userId) || null;
  }

  // Lifecycle Events
  async trackEvent(data: TrackEventInput): Promise<LifecycleEvent> {
    this.logger.log(`Tracking event ${data.event} for user ${data.userId}`);

    const event: LifecycleEvent = {
      id: `event-${Date.now()}`,
      userId: data.userId,
      event: data.event,
      properties: data.properties || {},
      timestamp: data.timestamp || new Date(),
    };

    const userEvents = this.events.get(data.userId) || [];
    userEvents.push(event);
    this.events.set(data.userId, userEvents);

    // Check triggers
    for (const trigger of this.triggers.values()) {
      if (trigger.isActive && trigger.triggerType === 'CUSTOM_EVENT') {
        if (trigger.conditions?.eventName === data.event) {
          await this.fireTrigger(trigger.id, data.userId, data.properties);
        }
      }
    }

    return event;
  }

  async getEvents(userId: string, options?: EventQueryOptions): Promise<LifecycleEvent[]> {
    let events = this.events.get(userId) || [];

    if (options?.events?.length) {
      events = events.filter((e) => options.events!.includes(e.event));
    }
    if (options?.startDate) {
      events = events.filter((e) => e.timestamp >= options.startDate!);
    }
    if (options?.endDate) {
      events = events.filter((e) => e.timestamp <= options.endDate!);
    }
    if (options?.limit) {
      events = events.slice(-options.limit);
    }

    return events;
  }

  async updateLifecycleStage(userId: string, stage: LifecycleStage, reason?: string): Promise<UserLifecycle> {
    this.logger.log(`Updating lifecycle stage for ${userId} to ${stage}`);

    const current = this.lifecycles.get(userId);

    const lifecycle: UserLifecycle = {
      userId,
      stage,
      previousStage: current?.stage,
      changedAt: new Date(),
      reason,
      metrics: {
        totalOrders: Math.floor(Math.random() * 50),
        totalRevenue: Math.floor(Math.random() * 10000),
        daysSinceLastOrder: Math.floor(Math.random() * 90),
        averageOrderValue: Math.floor(Math.random() * 200),
        engagementScore: Math.random() * 100,
      },
    };

    this.lifecycles.set(userId, lifecycle);
    return lifecycle;
  }

  async getLifecycleStage(userId: string): Promise<UserLifecycle> {
    const lifecycle = this.lifecycles.get(userId);
    if (!lifecycle) {
      return this.updateLifecycleStage(userId, 'ANONYMOUS');
    }
    return lifecycle;
  }

  async getLifecycleMetrics(organizationId: string): Promise<LifecycleMetrics> {
    const allLifecycles = Array.from(this.lifecycles.values());

    const stageDistribution: Record<LifecycleStage, number> = {
      ANONYMOUS: 0,
      LEAD: 0,
      PROSPECT: 0,
      CUSTOMER: 0,
      REPEAT_CUSTOMER: 0,
      CHAMPION: 0,
      AT_RISK: 0,
      CHURNED: 0,
    };

    allLifecycles.forEach((l) => {
      stageDistribution[l.stage]++;
    });

    return {
      stageDistribution,
      transitions: [
        { fromStage: 'LEAD', toStage: 'PROSPECT', count: 150, percentage: 30 },
        { fromStage: 'PROSPECT', toStage: 'CUSTOMER', count: 75, percentage: 50 },
        { fromStage: 'CUSTOMER', toStage: 'REPEAT_CUSTOMER', count: 45, percentage: 60 },
        { fromStage: 'CUSTOMER', toStage: 'AT_RISK', count: 15, percentage: 20 },
      ],
      churnRate: 5.2,
      retentionRate: 94.8,
      averageLifetimeValue: 450,
    };
  }
}
