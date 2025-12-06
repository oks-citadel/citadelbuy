/**
 * Test Agents - Main Entry Point
 *
 * Comprehensive testing framework for CitadelBuy platform.
 * Provides orchestrated execution of all testing agents.
 */

// Orchestrator
export { TestOrchestrator, orchestrator, AGENT_REGISTRY } from './orchestrator';
export type { AgentConfig, AgentType, TestResult, AgentReport, OrchestratorConfig } from './orchestrator';

// Reporting
export { ReportingAgent, reportingAgent, generateReport } from './reporting.agent';
export type { FinalReport, ReportConfig } from './reporting.agent';

// Core Agents
export * from './core';

/**
 * Run all tests with default configuration
 */
export async function runAllTests(config?: { verbose?: boolean; parallel?: boolean }) {
  const { TestOrchestrator } = await import('./orchestrator');
  const { ReportingAgent } = await import('./reporting.agent');

  const orchestrator = new TestOrchestrator({
    maxParallelAgents: config?.parallel ? 4 : 1,
  });

  const reporting = new ReportingAgent({
    formats: ['console', 'json', 'html'],
  });

  // Set up event handlers
  orchestrator.on('agent:start', (agent) => {
    if (config?.verbose) {
      console.log(`\n🚀 Starting: ${agent.name}`);
    }
  });

  orchestrator.on('agent:complete', (report) => {
    reporting.addAgentReport(report);
    if (config?.verbose) {
      const icon = report.status === 'completed' && report.summary.failed === 0 ? '✅' : '❌';
      console.log(`${icon} ${report.agent}: ${report.summary.passed}/${report.summary.total} passed`);
    }
  });

  // Run tests
  await orchestrator.runAllAgents();

  // Generate reports
  await reporting.generateReports();

  return reporting.generateFinalReport();
}

/**
 * Run specific agent types
 */
export async function runAgents(
  agentTypes: string[],
  config?: { verbose?: boolean }
) {
  const { TestOrchestrator } = await import('./orchestrator');
  const orchestrator = new TestOrchestrator();

  return orchestrator.runAgents(agentTypes as any);
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
CitadelBuy Test Agent Framework

Usage:
  npx ts-node tests/agents/index.ts [options] [agents...]

Options:
  --help, -h      Show this help message
  --verbose, -v   Show detailed output
  --parallel, -p  Run agents in parallel
  --list          List available agents

Agents:
  authentication          Auth and authorization tests
  product-catalog         Product management tests
  cart-checkout           Cart and checkout tests
  payment-processing      Payment gateway tests
  order-management        Order lifecycle tests
  shipping-logistics      Shipping and tracking tests
  vendor-portal           Vendor/supplier tests
  security               Security vulnerability tests

Examples:
  npx ts-node tests/agents/index.ts --verbose
  npx ts-node tests/agents/index.ts authentication cart-checkout
  npx ts-node tests/agents/index.ts --parallel -v
`);
    return;
  }

  if (args.includes('--list')) {
    const { AGENT_REGISTRY } = await import('./orchestrator');
    console.log('\nAvailable Test Agents:\n');
    AGENT_REGISTRY.forEach(agent => {
      const status = agent.enabled ? '✅' : '❌';
      console.log(`  ${status} ${agent.type.padEnd(25)} - ${agent.name}`);
    });
    return;
  }

  const verbose = args.includes('--verbose') || args.includes('-v');
  const parallel = args.includes('--parallel') || args.includes('-p');

  // Filter out option flags
  const agentArgs = args.filter(a => !a.startsWith('-'));

  if (agentArgs.length > 0) {
    console.log(`Running specific agents: ${agentArgs.join(', ')}`);
    await runAgents(agentArgs, { verbose });
  } else {
    console.log('Running all test agents...\n');
    const report = await runAllTests({ verbose, parallel });

    // Exit with error code if there were failures
    if (report.summary.failedTests > 0) {
      process.exit(1);
    }
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}
