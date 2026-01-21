/**
 * Order Automation Example
 *
 * This file demonstrates how to integrate the automation module
 * with an order processing system.
 *
 * This is an example file - not meant to be imported directly.
 * Use it as a reference for implementing automation in your modules.
 */

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { WorkflowEngineService } from '../workflow-engine.service';
import { AutomationRulesService } from '../automation-rules.service';

@Injectable()
export class OrderAutomationExample implements OnModuleInit {
  private readonly logger = new Logger(OrderAutomationExample.name);

  constructor(
    private readonly workflowEngine: WorkflowEngineService,
    private readonly automationRules: AutomationRulesService,
  ) {}

  async onModuleInit() {
    // Initialize workflows and rules when module starts
    await this.setupOrderWorkflow();
    await this.setupAutomationRules();
  }

  /**
   * Setup Order Processing Workflow
   */
  private async setupOrderWorkflow() {
    await this.workflowEngine.defineWorkflow({
      name: 'order-processing',
      entityType: 'order',
      initialState: 'PENDING',
      states: [
        'PENDING',
        'PAYMENT_PROCESSING',
        'CONFIRMED',
        'PROCESSING',
        'SHIPPED',
        'DELIVERED',
        'CANCELLED',
        'REFUNDED',
      ],
      transitions: [
        // Payment processing
        {
          from: 'PENDING',
          to: 'PAYMENT_PROCESSING',
          event: 'process_payment',
          hooks: {
            before: [
              async (ctx) => {
                this.logger.log(`Processing payment for order ${ctx.entityId}`);
              },
            ],
          },
        },

        // Payment confirmed
        {
          from: 'PAYMENT_PROCESSING',
          to: 'CONFIRMED',
          event: 'payment_confirmed',
          guards: [
            async (ctx) => {
              // Verify payment is actually completed
              // In real implementation, check with payment service
              return true;
            },
          ],
          hooks: {
            after: [
              async (ctx) => {
                this.logger.log(`Order ${ctx.entityId} confirmed - sending confirmation email`);
                // Send order confirmation email
                // await this.emailService.sendOrderConfirmation(ctx.entityId);
              },
            ],
          },
        },

        // Start processing
        {
          from: 'CONFIRMED',
          to: 'PROCESSING',
          event: 'start_processing',
          guards: [
            async (ctx) => {
              // Check inventory availability
              // In real implementation, check with inventory service
              return true;
            },
          ],
          hooks: {
            before: [
              async (ctx) => {
                this.logger.log(`Reserving inventory for order ${ctx.entityId}`);
                // Reserve inventory
                // await this.inventoryService.reserve(ctx.entityId);
              },
            ],
            after: [
              async (ctx) => {
                this.logger.log(`Order ${ctx.entityId} is being processed`);
                // Notify warehouse
                // await this.warehouseService.notifyNewOrder(ctx.entityId);
              },
            ],
          },
        },

        // Ship order
        {
          from: 'PROCESSING',
          to: 'SHIPPED',
          event: 'ship',
          guards: [
            async (ctx) => {
              // Verify all items are picked and packed
              return true;
            },
          ],
          hooks: {
            after: [
              async (ctx) => {
                this.logger.log(`Order ${ctx.entityId} shipped`);
                // Generate tracking number
                // const tracking = await this.shippingService.createShipment(ctx.entityId);
                // Send shipping notification
                // await this.emailService.sendShippingNotification(ctx.entityId, tracking);
              },
            ],
          },
        },

        // Deliver order
        {
          from: 'SHIPPED',
          to: 'DELIVERED',
          event: 'deliver',
          hooks: {
            after: [
              async (ctx) => {
                this.logger.log(`Order ${ctx.entityId} delivered`);
                // Send delivery confirmation
                // await this.emailService.sendDeliveryConfirmation(ctx.entityId);
                // Request review
                // await this.reviewService.requestReview(ctx.entityId);
              },
            ],
          },
        },

        // Cancel order (from multiple states)
        {
          from: ['PENDING', 'PAYMENT_PROCESSING', 'CONFIRMED', 'PROCESSING'],
          to: 'CANCELLED',
          event: 'cancel',
          hooks: {
            before: [
              async (ctx) => {
                this.logger.log(`Cancelling order ${ctx.entityId}`);
                // Release inventory if it was reserved
                // await this.inventoryService.release(ctx.entityId);
              },
            ],
            after: [
              async (ctx) => {
                this.logger.log(`Order ${ctx.entityId} cancelled`);
                // Initiate refund if payment was processed
                // await this.paymentService.refund(ctx.entityId);
                // Send cancellation email
                // await this.emailService.sendCancellationNotification(ctx.entityId);
              },
            ],
          },
        },

        // Refund delivered order
        {
          from: 'DELIVERED',
          to: 'REFUNDED',
          event: 'refund',
          hooks: {
            after: [
              async (ctx) => {
                this.logger.log(`Order ${ctx.entityId} refunded`);
                // Process refund
                // await this.paymentService.processRefund(ctx.entityId);
              },
            ],
          },
        },
      ],
      metadata: {
        version: '1.0',
        department: 'operations',
      },
    });

    this.logger.log('Order processing workflow initialized');
  }

  /**
   * Setup Automation Rules
   */
  private async setupAutomationRules() {
    // Rule 1: High-value order notification
    await this.automationRules.createRule({
      name: 'High-value order alert',
      description: 'Notify sales team when order exceeds $1000',
      enabled: true,
      priority: 10,
      trigger: {
        type: 'event',
        event: 'order.created',
      },
      conditions: {
        operator: 'AND',
        conditions: [
          { field: 'total', operator: 'greater_than', value: 1000 },
          { field: 'status', operator: 'equals', value: 'PENDING' },
        ],
      },
      actions: [
        {
          type: 'emit_event',
          params: {
            event: 'order.high_value',
            payload: { priority: 'high' },
          },
        },
        {
          type: 'log',
          params: {
            level: 'info',
            message: 'High-value order detected',
          },
        },
      ],
      metadata: {
        category: 'notifications',
        team: 'sales',
      },
    });

    // Rule 2: VIP customer priority processing
    await this.automationRules.createRule({
      name: 'VIP customer priority',
      description: 'Fast-track orders from VIP customers',
      enabled: true,
      priority: 20,
      trigger: {
        type: 'event',
        event: 'order.created',
      },
      conditions: {
        operator: 'AND',
        conditions: [
          { field: 'customer.tier', operator: 'equals', value: 'VIP' },
          { field: 'status', operator: 'equals', value: 'PENDING' },
        ],
      },
      actions: [
        {
          type: 'emit_event',
          params: {
            event: 'order.priority_processing',
            payload: { priority: 'vip' },
          },
        },
        {
          type: 'log',
          params: {
            level: 'info',
            message: 'VIP customer order - priority processing',
          },
        },
      ],
    });

    // Rule 3: Fraud detection for suspicious orders
    await this.automationRules.createRule({
      name: 'Fraud detection',
      description: 'Flag suspicious orders for manual review',
      enabled: true,
      priority: 30,
      trigger: {
        type: 'event',
        event: 'order.created',
      },
      conditions: {
        operator: 'OR',
        conditions: [
          {
            operator: 'AND',
            conditions: [
              { field: 'total', operator: 'greater_than', value: 5000 },
              { field: 'customer.accountAge', operator: 'less_than', value: 7 },
            ],
          },
          {
            operator: 'AND',
            conditions: [
              { field: 'shippingCountry', operator: 'not_equals', value: 'billingCountry' },
              { field: 'total', operator: 'greater_than', value: 2000 },
            ],
          },
        ],
      },
      actions: [
        {
          type: 'emit_event',
          params: {
            event: 'order.fraud_check_required',
            payload: { requiresManualReview: true },
          },
        },
        {
          type: 'log',
          params: {
            level: 'warn',
            message: 'Order flagged for fraud review',
          },
        },
      ],
    });

    // Rule 4: Low stock alert when order is placed
    await this.automationRules.createRule({
      name: 'Low stock alert on order',
      description: 'Alert inventory team when ordered items are running low',
      enabled: true,
      priority: 5,
      trigger: {
        type: 'event',
        event: 'order.confirmed',
      },
      conditions: {
        operator: 'AND',
        conditions: [
          { field: 'items', operator: 'is_not_null', value: null },
        ],
      },
      actions: [
        {
          type: 'emit_event',
          params: {
            event: 'inventory.check_stock',
          },
        },
      ],
    });

    this.logger.log('Automation rules initialized');
  }

  /**
   * Example: Handle order creation
   */
  @OnEvent('order.created')
  async handleOrderCreated(payload: any) {
    const { orderId, userId, total } = payload;

    // Create workflow instance for the order
    await this.workflowEngine.createInstance(
      'order-processing',
      orderId,
      { userId, total },
      userId,
    );

    this.logger.log(`Workflow instance created for order ${orderId}`);
  }

  /**
   * Example: Handle payment confirmation
   */
  @OnEvent('payment.confirmed')
  async handlePaymentConfirmed(payload: any) {
    const { orderId, userId } = payload;

    // Transition workflow: PENDING -> PAYMENT_PROCESSING -> CONFIRMED
    try {
      await this.workflowEngine.transition(
        'order-processing',
        orderId,
        'process_payment',
        { userId },
      );

      await this.workflowEngine.transition(
        'order-processing',
        orderId,
        'payment_confirmed',
        { userId },
      );

      this.logger.log(`Order ${orderId} payment confirmed`);
    } catch (error) {
      this.logger.error(`Failed to confirm payment for order ${orderId}:`, error);
    }
  }

  /**
   * Example: Start order processing
   */
  async processOrder(orderId: string, userId: string) {
    try {
      // Check if transition is allowed
      const canProcess = await this.workflowEngine.canTransition(
        'order-processing',
        orderId,
        'start_processing',
      );

      if (!canProcess) {
        throw new Error('Order cannot be processed at this time');
      }

      // Execute transition
      await this.workflowEngine.transition(
        'order-processing',
        orderId,
        'start_processing',
        { userId },
      );

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to process order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Example: Ship order
   */
  async shipOrder(orderId: string, trackingNumber: string, userId: string) {
    try {
      await this.workflowEngine.transition(
        'order-processing',
        orderId,
        'ship',
        {
          userId,
          data: { trackingNumber },
        },
      );

      return { success: true, trackingNumber };
    } catch (error) {
      this.logger.error(`Failed to ship order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Example: Cancel order
   */
  async cancelOrder(orderId: string, reason: string, userId: string) {
    try {
      // Get available transitions to check if cancellation is possible
      const transitions = this.workflowEngine.getAvailableTransitions(
        'order-processing',
        orderId,
      );

      const canCancel = transitions.some((t) => t.event === 'cancel');

      if (!canCancel) {
        throw new Error('Order cannot be cancelled in current state');
      }

      await this.workflowEngine.transition(
        'order-processing',
        orderId,
        'cancel',
        {
          userId,
          data: { reason },
        },
      );

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to cancel order ${orderId}:`, error);
      throw error;
    }
  }

  /**
   * Example: Get order workflow status
   */
  async getOrderStatus(orderId: string) {
    const instance = this.workflowEngine.getInstance('order-processing', orderId);

    if (!instance) {
      return null;
    }

    const history = this.workflowEngine.getHistory('order-processing', orderId);
    const transitions = this.workflowEngine.getAvailableTransitions(
      'order-processing',
      orderId,
    );

    return {
      currentState: instance.currentState,
      history,
      availableActions: transitions.map((t) => ({
        event: t.event,
        targetState: t.to,
      })),
      metadata: instance.metadata,
    };
  }

  /**
   * Example: Listen to workflow state changes
   */
  @OnEvent('workflow.order-processing.SHIPPED')
  async handleOrderShipped(payload: any) {
    const orderId = payload.instance.entityId;
    this.logger.log(`Order ${orderId} has been shipped - sending notification`);

    // Send shipping notification
    // await this.notificationService.send({
    //   type: 'order_shipped',
    //   orderId,
    //   userId: payload.instance.metadata.userId
    // });
  }

  /**
   * Example: Listen to workflow state changes
   */
  @OnEvent('workflow.order-processing.DELIVERED')
  async handleOrderDelivered(payload: any) {
    const orderId = payload.instance.entityId;
    this.logger.log(`Order ${orderId} has been delivered`);

    // Request product review after 2 days
    setTimeout(async () => {
      // await this.reviewService.requestReview(orderId);
    }, 2 * 24 * 60 * 60 * 1000);
  }

  /**
   * Example: Listen to automation rule execution
   */
  @OnEvent('automation.rule.executed')
  async handleRuleExecution(payload: any) {
    const { result } = payload;

    if (result.matched && result.executed) {
      this.logger.debug(
        `Rule '${result.ruleName}' executed successfully in ${result.duration}ms`,
      );
    }
  }
}
