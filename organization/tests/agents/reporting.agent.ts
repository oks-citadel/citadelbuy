/**
 * Reporting Agent
 *
 * Aggregates test results from all agents and generates comprehensive reports.
 * Supports multiple output formats: JSON, HTML, Console, and CI integrations.
 */

import * as fs from 'fs';
import * as path from 'path';

export interface TestResult {
  agent: string;
  suite: string;
  test: string;
  status: 'passed' | 'failed' | 'skipped' | 'pending';
  duration: number;
  error?: string;
  errorStack?: string;
  metadata?: Record<string, any>;
  retryCount?: number;
}

export interface AgentReport {
  agent: string;
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

export interface FinalReport {
  summary: {
    totalAgents: number;
    completedAgents: number;
    failedAgents: number;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    skippedTests: number;
    duration: number;
    timestamp: Date;
  };
  agents: AgentReport[];
  failedTests: TestResult[];
  coverage?: {
    endpoints: number;
    covered: number;
    percentage: number;
  };
}

export interface ReportConfig {
  outputDir: string;
  formats: ('json' | 'html' | 'console' | 'junit')[];
  includeStackTraces: boolean;
  includeDuration: boolean;
  groupByAgent: boolean;
  showSkipped: boolean;
}

const DEFAULT_CONFIG: ReportConfig = {
  outputDir: './test-reports',
  formats: ['json', 'html', 'console'],
  includeStackTraces: true,
  includeDuration: true,
  groupByAgent: true,
  showSkipped: true,
};

/**
 * Reporting Agent Class
 */
export class ReportingAgent {
  private config: ReportConfig;
  private agentReports: AgentReport[] = [];

  constructor(config: Partial<ReportConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Add agent report to collection
   */
  addAgentReport(report: AgentReport): void {
    this.agentReports.push(report);
  }

  /**
   * Generate final report from all agent reports
   */
  generateFinalReport(): FinalReport {
    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let skippedTests = 0;
    let totalDuration = 0;
    const allFailedTests: TestResult[] = [];

    this.agentReports.forEach(report => {
      totalTests += report.summary.total;
      passedTests += report.summary.passed;
      failedTests += report.summary.failed;
      skippedTests += report.summary.skipped;
      totalDuration += report.duration;

      // Collect failed tests
      report.results
        .filter(r => r.status === 'failed')
        .forEach(r => allFailedTests.push(r));
    });

    return {
      summary: {
        totalAgents: this.agentReports.length,
        completedAgents: this.agentReports.filter(r => r.status === 'completed').length,
        failedAgents: this.agentReports.filter(r => r.status === 'failed').length,
        totalTests,
        passedTests,
        failedTests,
        skippedTests,
        duration: totalDuration,
        timestamp: new Date(),
      },
      agents: this.agentReports,
      failedTests: allFailedTests,
    };
  }

  /**
   * Generate all reports
   */
  async generateReports(): Promise<void> {
    const report = this.generateFinalReport();

    // Ensure output directory exists
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    for (const format of this.config.formats) {
      switch (format) {
        case 'json':
          await this.generateJsonReport(report);
          break;
        case 'html':
          await this.generateHtmlReport(report);
          break;
        case 'console':
          this.generateConsoleReport(report);
          break;
        case 'junit':
          await this.generateJunitReport(report);
          break;
      }
    }
  }

  /**
   * Generate JSON report
   */
  private async generateJsonReport(report: FinalReport): Promise<void> {
    const filePath = path.join(this.config.outputDir, 'test-report.json');
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
    console.log(`JSON report generated: ${filePath}`);
  }

  /**
   * Generate HTML report
   */
  private async generateHtmlReport(report: FinalReport): Promise<void> {
    const html = this.renderHtmlReport(report);
    const filePath = path.join(this.config.outputDir, 'test-report.html');
    fs.writeFileSync(filePath, html);
    console.log(`HTML report generated: ${filePath}`);
  }

  /**
   * Generate console report
   */
  private generateConsoleReport(report: FinalReport): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST EXECUTION REPORT');
    console.log('='.repeat(80));
    console.log(`Timestamp: ${report.summary.timestamp.toISOString()}`);
    console.log('');

    // Summary
    console.log('📈 SUMMARY');
    console.log('-'.repeat(40));
    console.log(`Total Agents: ${report.summary.totalAgents}`);
    console.log(`  ✅ Completed: ${report.summary.completedAgents}`);
    console.log(`  ❌ Failed: ${report.summary.failedAgents}`);
    console.log('');
    console.log(`Total Tests: ${report.summary.totalTests}`);
    console.log(`  ✅ Passed: ${report.summary.passedTests}`);
    console.log(`  ❌ Failed: ${report.summary.failedTests}`);
    console.log(`  ⏭️  Skipped: ${report.summary.skippedTests}`);
    console.log('');
    console.log(`Duration: ${this.formatDuration(report.summary.duration)}`);
    console.log('');

    // Pass rate
    const passRate = report.summary.totalTests > 0
      ? ((report.summary.passedTests / report.summary.totalTests) * 100).toFixed(1)
      : 0;
    console.log(`Pass Rate: ${passRate}%`);
    console.log('');

    // Agent breakdown
    if (this.config.groupByAgent) {
      console.log('📋 AGENT BREAKDOWN');
      console.log('-'.repeat(40));

      report.agents.forEach(agent => {
        const icon = agent.status === 'completed' && agent.summary.failed === 0 ? '✅' : '❌';
        console.log(`${icon} ${agent.agent}`);
        console.log(`   Tests: ${agent.summary.passed}/${agent.summary.total} passed`);
        console.log(`   Duration: ${this.formatDuration(agent.duration)}`);
        console.log('');
      });
    }

    // Failed tests
    if (report.failedTests.length > 0) {
      console.log('❌ FAILED TESTS');
      console.log('-'.repeat(40));

      report.failedTests.forEach(test => {
        console.log(`\n${test.agent} > ${test.suite} > ${test.test}`);
        if (test.error) {
          console.log(`   Error: ${test.error}`);
        }
        if (this.config.includeStackTraces && test.errorStack) {
          console.log(`   Stack: ${test.errorStack.split('\n')[0]}`);
        }
      });
      console.log('');
    }

    console.log('='.repeat(80));
  }

  /**
   * Generate JUnit XML report for CI integration
   */
  private async generateJunitReport(report: FinalReport): Promise<void> {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<testsuites>\n';

    report.agents.forEach(agent => {
      xml += `  <testsuite name="${this.escapeXml(agent.agent)}" `;
      xml += `tests="${agent.summary.total}" `;
      xml += `failures="${agent.summary.failed}" `;
      xml += `skipped="${agent.summary.skipped}" `;
      xml += `time="${(agent.duration / 1000).toFixed(3)}">\n`;

      agent.results.forEach(test => {
        xml += `    <testcase name="${this.escapeXml(test.test)}" `;
        xml += `classname="${this.escapeXml(test.suite)}" `;
        xml += `time="${(test.duration / 1000).toFixed(3)}"`;

        if (test.status === 'passed') {
          xml += '/>\n';
        } else if (test.status === 'failed') {
          xml += '>\n';
          xml += `      <failure message="${this.escapeXml(test.error || 'Test failed')}"`;
          if (test.errorStack) {
            xml += `>${this.escapeXml(test.errorStack)}</failure>\n`;
          } else {
            xml += '/>\n';
          }
          xml += '    </testcase>\n';
        } else if (test.status === 'skipped') {
          xml += '>\n';
          xml += '      <skipped/>\n';
          xml += '    </testcase>\n';
        }
      });

      xml += '  </testsuite>\n';
    });

    xml += '</testsuites>\n';

    const filePath = path.join(this.config.outputDir, 'test-report.xml');
    fs.writeFileSync(filePath, xml);
    console.log(`JUnit report generated: ${filePath}`);
  }

  /**
   * Render HTML report
   */
  private renderHtmlReport(report: FinalReport): string {
    const passRate = report.summary.totalTests > 0
      ? ((report.summary.passedTests / report.summary.totalTests) * 100).toFixed(1)
      : '0';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Report - Broxiva Platform</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    h1 {
      color: #1a1a1a;
      margin-bottom: 10px;
    }
    .timestamp {
      color: #666;
      margin-bottom: 20px;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .card-title {
      font-size: 14px;
      color: #666;
      margin-bottom: 8px;
    }
    .card-value {
      font-size: 32px;
      font-weight: bold;
    }
    .card-value.success { color: #22c55e; }
    .card-value.danger { color: #ef4444; }
    .card-value.warning { color: #f59e0b; }
    .card-value.info { color: #3b82f6; }
    .progress-bar {
      height: 8px;
      background: #e5e5e5;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 10px;
    }
    .progress-fill {
      height: 100%;
      background: #22c55e;
    }
    .agents {
      margin-bottom: 30px;
    }
    .agent {
      background: white;
      border-radius: 8px;
      margin-bottom: 15px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .agent-header {
      padding: 15px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      border-bottom: 1px solid #eee;
    }
    .agent-header:hover {
      background: #f9f9f9;
    }
    .agent-name {
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .agent-stats {
      display: flex;
      gap: 15px;
      font-size: 14px;
      color: #666;
    }
    .agent-details {
      padding: 0 20px;
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease;
    }
    .agent-details.open {
      max-height: 2000px;
      padding: 20px;
    }
    .test-suite {
      margin-bottom: 20px;
    }
    .suite-name {
      font-weight: 600;
      margin-bottom: 10px;
      color: #444;
    }
    .test {
      padding: 8px 0;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .test:last-child {
      border-bottom: none;
    }
    .test-name {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .test-duration {
      font-size: 12px;
      color: #999;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    .badge-passed { background: #dcfce7; color: #166534; }
    .badge-failed { background: #fee2e2; color: #991b1b; }
    .badge-skipped { background: #fef3c7; color: #92400e; }
    .error-message {
      background: #fee2e2;
      color: #991b1b;
      padding: 10px;
      border-radius: 4px;
      margin-top: 8px;
      font-family: monospace;
      font-size: 12px;
      white-space: pre-wrap;
    }
    .icon {
      font-size: 18px;
    }
    .section-title {
      font-size: 20px;
      margin-bottom: 15px;
      color: #1a1a1a;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Test Execution Report</h1>
    <p class="timestamp">Generated: ${report.summary.timestamp.toISOString()}</p>

    <div class="summary">
      <div class="card">
        <div class="card-title">Total Tests</div>
        <div class="card-value info">${report.summary.totalTests}</div>
      </div>
      <div class="card">
        <div class="card-title">Passed</div>
        <div class="card-value success">${report.summary.passedTests}</div>
      </div>
      <div class="card">
        <div class="card-title">Failed</div>
        <div class="card-value danger">${report.summary.failedTests}</div>
      </div>
      <div class="card">
        <div class="card-title">Skipped</div>
        <div class="card-value warning">${report.summary.skippedTests}</div>
      </div>
      <div class="card">
        <div class="card-title">Pass Rate</div>
        <div class="card-value ${parseFloat(passRate) >= 80 ? 'success' : parseFloat(passRate) >= 50 ? 'warning' : 'danger'}">${passRate}%</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${passRate}%"></div>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Duration</div>
        <div class="card-value info">${this.formatDuration(report.summary.duration)}</div>
      </div>
    </div>

    <h2 class="section-title">Agent Results</h2>
    <div class="agents">
      ${report.agents.map(agent => this.renderAgentHtml(agent)).join('')}
    </div>

    ${report.failedTests.length > 0 ? `
    <h2 class="section-title">❌ Failed Tests</h2>
    <div class="card">
      ${report.failedTests.map(test => `
        <div class="test">
          <div class="test-name">
            <span class="icon">❌</span>
            <span>${this.escapeHtml(test.agent)} > ${this.escapeHtml(test.suite)} > ${this.escapeHtml(test.test)}</span>
          </div>
        </div>
        ${test.error ? `<div class="error-message">${this.escapeHtml(test.error)}</div>` : ''}
      `).join('')}
    </div>
    ` : ''}
  </div>

  <script>
    document.querySelectorAll('.agent-header').forEach(header => {
      header.addEventListener('click', () => {
        const details = header.nextElementSibling;
        details.classList.toggle('open');
      });
    });
  </script>
</body>
</html>`;
  }

  /**
   * Render agent section HTML
   */
  private renderAgentHtml(agent: AgentReport): string {
    const icon = agent.status === 'completed' && agent.summary.failed === 0 ? '✅' : '❌';

    // Group tests by suite
    const suites = new Map<string, TestResult[]>();
    agent.results.forEach(test => {
      if (!suites.has(test.suite)) {
        suites.set(test.suite, []);
      }
      suites.get(test.suite)!.push(test);
    });

    return `
      <div class="agent">
        <div class="agent-header">
          <div class="agent-name">
            <span class="icon">${icon}</span>
            <span>${this.escapeHtml(agent.agent)}</span>
          </div>
          <div class="agent-stats">
            <span>✅ ${agent.summary.passed}</span>
            <span>❌ ${agent.summary.failed}</span>
            <span>⏭️ ${agent.summary.skipped}</span>
            <span>⏱️ ${this.formatDuration(agent.duration)}</span>
          </div>
        </div>
        <div class="agent-details">
          ${Array.from(suites.entries()).map(([suite, tests]) => `
            <div class="test-suite">
              <div class="suite-name">${this.escapeHtml(suite)}</div>
              ${tests.map(test => `
                <div class="test">
                  <div class="test-name">
                    <span class="badge badge-${test.status}">${test.status}</span>
                    <span>${this.escapeHtml(test.test)}</span>
                  </div>
                  <span class="test-duration">${test.duration}ms</span>
                </div>
                ${test.status === 'failed' && test.error ? `
                  <div class="error-message">${this.escapeHtml(test.error)}</div>
                ` : ''}
              `).join('')}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Format duration
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

/**
 * Export default instance
 */
export const reportingAgent = new ReportingAgent();

/**
 * Generate report from orchestrator results
 */
export async function generateReport(
  agentReports: AgentReport[],
  config?: Partial<ReportConfig>
): Promise<FinalReport> {
  const agent = new ReportingAgent(config);

  agentReports.forEach(report => agent.addAgentReport(report));

  await agent.generateReports();

  return agent.generateFinalReport();
}
