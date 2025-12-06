/**
 * Test Orchestrator Agent
 *
 * Coordinates all sub-agents for comprehensive platform testing.
 * Manages test execution, parallel processing, and result aggregation.
 */

import { EventEmitter } from 'events';

// Agent types
export type AgentType =
  | 'authentication'
  | 'product-catalog'
  | 'cart-checkout'
  | 'payment-processing'
  | 'order-management'
  | 'dropshipping-fulfillment'
  | 'shipping-logistics'
  | 'user-account'
  | 'vendor-portal'
  | 'admin-dashboard'
  | 'api-gateway'
  | 'database-integrity'
  | 'cache-performance'
  | 'notification'
  | 'search-discovery'
  | 'security'
  | 'integration'
  | 'frontend-ui'
  | 'mobile-pwa'
  | 'analytics-tracking';

export interface AgentConfig {
  name: string;
  type: AgentType;
  enabled: boolean;
  priority: number;
  timeout: number;
  retries: number;
  dependencies?: AgentType[];
  parallelizable: boolean;
}

export interface TestResult {
  agent: AgentType;
  suite: string;
  test: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration: number;
  error?: string;
  metadata?: Record<string, any>;
}

export interface AgentReport {
  agent: AgentType;
  status: 'completed' | 'failed' | 'timeout';
  startTime: Date;
  endTime: Date;
  duration: number;
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
}

export interface OrchestratorConfig {
  maxParallelAgents: number;
  defaultTimeout: number;
  retryFailedTests: boolean;
  maxRetries: number;
  stopOnFirstFailure: boolean;
  generateReport: boolean;
  reportFormat: 'json' | 'html' | 'both';
}

const DEFAULT_CONFIG: OrchestratorConfig = {
  maxParallelAgents: 4,
  defaultTimeout: 300000, // 5 minutes
  retryFailedTests: true,
  maxRetries: 2,
  stopOnFirstFailure: false,
  generateReport: true,
  reportFormat: 'both',
};

/**
 * Agent Registry - Configuration for all testing agents
 */
export const AGENT_REGISTRY: AgentConfig[] = [
  // Core Testing Agents
  {
    name: 'Authentication & Authorization Agent',
    type: 'authentication',
    enabled: true,
    priority: 1,
    timeout: 120000,
    retries: 2,
    parallelizable: false,
  },
  {
    name: 'Product Catalog Agent',
    type: 'product-catalog',
    enabled: true,
    priority: 2,
    timeout: 180000,
    retries: 2,
    dependencies: ['authentication'],
    parallelizable: true,
  },
  {
    name: 'Cart & Checkout Agent',
    type: 'cart-checkout',
    enabled: true,
    priority: 3,
    timeout: 180000,
    retries: 2,
    dependencies: ['authentication', 'product-catalog'],
    parallelizable: true,
  },
  {
    name: 'Payment Processing Agent',
    type: 'payment-processing',
    enabled: true,
    priority: 4,
    timeout: 240000,
    retries: 3,
    dependencies: ['cart-checkout'],
    parallelizable: false,
  },
  {
    name: 'Order Management Agent',
    type: 'order-management',
    enabled: true,
    priority: 5,
    timeout: 180000,
    retries: 2,
    dependencies: ['payment-processing'],
    parallelizable: true,
  },
  {
    name: 'Dropshipping Fulfillment Agent',
    type: 'dropshipping-fulfillment',
    enabled: true,
    priority: 6,
    timeout: 180000,
    retries: 2,
    dependencies: ['order-management'],
    parallelizable: true,
  },
  {
    name: 'Shipping & Logistics Agent',
    type: 'shipping-logistics',
    enabled: true,
    priority: 6,
    timeout: 180000,
    retries: 2,
    dependencies: ['order-management'],
    parallelizable: true,
  },
  {
    name: 'User Account Agent',
    type: 'user-account',
    enabled: true,
    priority: 2,
    timeout: 120000,
    retries: 2,
    dependencies: ['authentication'],
    parallelizable: true,
  },
  {
    name: 'Vendor/Supplier Portal Agent',
    type: 'vendor-portal',
    enabled: true,
    priority: 3,
    timeout: 180000,
    retries: 2,
    dependencies: ['authentication'],
    parallelizable: true,
  },
  {
    name: 'Admin Dashboard Agent',
    type: 'admin-dashboard',
    enabled: true,
    priority: 4,
    timeout: 180000,
    retries: 2,
    dependencies: ['authentication'],
    parallelizable: true,
  },
  // Technical Testing Agents
  {
    name: 'API Gateway Agent',
    type: 'api-gateway',
    enabled: true,
    priority: 1,
    timeout: 120000,
    retries: 2,
    parallelizable: true,
  },
  {
    name: 'Database Integrity Agent',
    type: 'database-integrity',
    enabled: true,
    priority: 1,
    timeout: 180000,
    retries: 1,
    parallelizable: false,
  },
  {
    name: 'Cache & Performance Agent',
    type: 'cache-performance',
    enabled: true,
    priority: 2,
    timeout: 180000,
    retries: 2,
    parallelizable: true,
  },
  {
    name: 'Notification Agent',
    type: 'notification',
    enabled: true,
    priority: 3,
    timeout: 120000,
    retries: 2,
    parallelizable: true,
  },
  {
    name: 'Search & Discovery Agent',
    type: 'search-discovery',
    enabled: true,
    priority: 2,
    timeout: 180000,
    retries: 2,
    parallelizable: true,
  },
  {
    name: 'Security Testing Agent',
    type: 'security',
    enabled: true,
    priority: 1,
    timeout: 300000,
    retries: 1,
    parallelizable: false,
  },
  {
    name: 'Integration Testing Agent',
    type: 'integration',
    enabled: true,
    priority: 5,
    timeout: 240000,
    retries: 2,
    dependencies: ['authentication', 'api-gateway'],
    parallelizable: false,
  },
  {
    name: 'Frontend UI Agent',
    type: 'frontend-ui',
    enabled: true,
    priority: 3,
    timeout: 300000,
    retries: 2,
    parallelizable: true,
  },
  {
    name: 'Mobile/PWA Agent',
    type: 'mobile-pwa',
    enabled: true,
    priority: 4,
    timeout: 300000,
    retries: 2,
    parallelizable: true,
  },
  {
    name: 'Analytics & Tracking Agent',
    type: 'analytics-tracking',
    enabled: true,
    priority: 5,
    timeout: 120000,
    retries: 2,
    parallelizable: true,
  },
];

/**
 * Test Orchestrator Class
 */
export class TestOrchestrator extends EventEmitter {
  private config: OrchestratorConfig;
  private agents: Map<AgentType, AgentConfig>;
  private results: Map<AgentType, AgentReport>;
  private runningAgents: Set<AgentType>;
  private completedAgents: Set<AgentType>;
  private startTime?: Date;
  private endTime?: Date;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.agents = new Map();
    this.results = new Map();
    this.runningAgents = new Set();
    this.completedAgents = new Set();

    // Register all agents
    AGENT_REGISTRY.forEach(agent => {
      if (agent.enabled) {
        this.agents.set(agent.type, agent);
      }
    });
  }

  /**
   * Get all enabled agents
   */
  getEnabledAgents(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  /**
   * Check if agent dependencies are satisfied
   */
  private dependenciesSatisfied(agent: AgentConfig): boolean {
    if (!agent.dependencies || agent.dependencies.length === 0) {
      return true;
    }
    return agent.dependencies.every(dep => this.completedAgents.has(dep));
  }

  /**
   * Get agents ready to run
   */
  private getReadyAgents(): AgentConfig[] {
    return Array.from(this.agents.values())
      .filter(agent => !this.completedAgents.has(agent.type))
      .filter(agent => !this.runningAgents.has(agent.type))
      .filter(agent => this.dependenciesSatisfied(agent))
      .sort((a, b) => a.priority - b.priority);
  }

  /**
   * Execute a single agent
   */
  async executeAgent(agent: AgentConfig): Promise<AgentReport> {
    const startTime = new Date();
    this.runningAgents.add(agent.type);
    this.emit('agent:start', agent);

    try {
      // Import and run the agent
      const agentModule = await import(`./core/${agent.type}.agent`);
      const results = await agentModule.runTests({
        timeout: agent.timeout,
        retries: agent.retries,
      });

      const endTime = new Date();
      const report: AgentReport = {
        agent: agent.type,
        status: 'completed',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        results,
        summary: this.summarizeResults(results),
      };

      return report;
    } catch (error: any) {
      const endTime = new Date();
      return {
        agent: agent.type,
        status: 'failed',
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        results: [{
          agent: agent.type,
          suite: 'Agent Execution',
          test: 'runTests',
          status: 'failed',
          duration: 0,
          error: error.message,
        }],
        summary: { total: 1, passed: 0, failed: 1, skipped: 0 },
      };
    } finally {
      this.runningAgents.delete(agent.type);
      this.completedAgents.add(agent.type);
    }
  }

  /**
   * Summarize test results
   */
  private summarizeResults(results: TestResult[]): AgentReport['summary'] {
    return {
      total: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
    };
  }

  /**
   * Run all agents
   */
  async runAllAgents(): Promise<Map<AgentType, AgentReport>> {
    this.startTime = new Date();
    this.emit('orchestrator:start');

    const runNextBatch = async () => {
      const readyAgents = this.getReadyAgents();

      if (readyAgents.length === 0) {
        if (this.runningAgents.size === 0) {
          return; // All done
        }
        // Wait for running agents
        await new Promise(resolve => setTimeout(resolve, 1000));
        return runNextBatch();
      }

      // Group parallelizable agents
      const parallelAgents = readyAgents.filter(a => a.parallelizable);
      const serialAgents = readyAgents.filter(a => !a.parallelizable);

      // Run parallel agents up to maxParallelAgents
      const batch = parallelAgents.slice(0, this.config.maxParallelAgents - this.runningAgents.size);

      // Also include first serial agent if we have capacity
      if (serialAgents.length > 0 && this.runningAgents.size < this.config.maxParallelAgents) {
        batch.push(serialAgents[0]);
      }

      const promises = batch.map(async agent => {
        const report = await this.executeAgent(agent);
        this.results.set(agent.type, report);
        this.emit('agent:complete', report);

        if (report.summary.failed > 0 && this.config.stopOnFirstFailure) {
          throw new Error(`Agent ${agent.type} had failures`);
        }
      });

      await Promise.all(promises);
      return runNextBatch();
    };

    try {
      await runNextBatch();
    } catch (error) {
      this.emit('orchestrator:error', error);
    }

    this.endTime = new Date();
    this.emit('orchestrator:complete', this.generateFinalReport());

    return this.results;
  }

  /**
   * Run specific agents only
   */
  async runAgents(agentTypes: AgentType[]): Promise<Map<AgentType, AgentReport>> {
    // Filter to only requested agents
    const filteredAgents = Array.from(this.agents.values())
      .filter(agent => agentTypes.includes(agent.type));

    // Create a temporary orchestrator with only these agents
    const tempAgents = new Map(filteredAgents.map(a => [a.type, a]));
    this.agents = tempAgents;

    return this.runAllAgents();
  }

  /**
   * Generate final report
   */
  generateFinalReport(): {
    summary: {
      totalAgents: number;
      completedAgents: number;
      failedAgents: number;
      totalTests: number;
      passedTests: number;
      failedTests: number;
      skippedTests: number;
      duration: number;
    };
    agents: AgentReport[];
  } {
    const agentReports = Array.from(this.results.values());

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let skippedTests = 0;

    agentReports.forEach(report => {
      totalTests += report.summary.total;
      passedTests += report.summary.passed;
      failedTests += report.summary.failed;
      skippedTests += report.summary.skipped;
    });

    return {
      summary: {
        totalAgents: this.agents.size,
        completedAgents: agentReports.filter(r => r.status === 'completed').length,
        failedAgents: agentReports.filter(r => r.status === 'failed').length,
        totalTests,
        passedTests,
        failedTests,
        skippedTests,
        duration: this.endTime && this.startTime
          ? this.endTime.getTime() - this.startTime.getTime()
          : 0,
      },
      agents: agentReports,
    };
  }
}

/**
 * Export default orchestrator instance
 */
export const orchestrator = new TestOrchestrator();

/**
 * CLI entry point
 */
export async function main(args: string[] = []) {
  const orchestrator = new TestOrchestrator();

  orchestrator.on('agent:start', (agent: AgentConfig) => {
    console.log(`\n🚀 Starting agent: ${agent.name}`);
  });

  orchestrator.on('agent:complete', (report: AgentReport) => {
    const icon = report.status === 'completed' && report.summary.failed === 0 ? '✅' : '❌';
    console.log(`${icon} Agent ${report.agent}: ${report.summary.passed}/${report.summary.total} passed`);
  });

  orchestrator.on('orchestrator:complete', (finalReport: ReturnType<TestOrchestrator['generateFinalReport']>) => {
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL TEST REPORT');
    console.log('='.repeat(60));
    console.log(`Total Agents: ${finalReport.summary.totalAgents}`);
    console.log(`Completed: ${finalReport.summary.completedAgents}`);
    console.log(`Failed: ${finalReport.summary.failedAgents}`);
    console.log('');
    console.log(`Total Tests: ${finalReport.summary.totalTests}`);
    console.log(`  ✅ Passed: ${finalReport.summary.passedTests}`);
    console.log(`  ❌ Failed: ${finalReport.summary.failedTests}`);
    console.log(`  ⏭️ Skipped: ${finalReport.summary.skippedTests}`);
    console.log('');
    console.log(`Duration: ${(finalReport.summary.duration / 1000).toFixed(2)}s`);
  });

  // Parse arguments for specific agents
  if (args.length > 0) {
    const agentTypes = args as AgentType[];
    await orchestrator.runAgents(agentTypes);
  } else {
    await orchestrator.runAllAgents();
  }
}
