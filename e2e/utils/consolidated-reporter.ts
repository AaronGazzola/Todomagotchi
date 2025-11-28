import { Reporter, TestCase, TestResult, FullResult, Suite, FullConfig, TestStep } from '@playwright/test/reporter';
import * as path from 'path';
import * as fs from 'fs';

interface ConsoleLog {
  type: string;
  text: string;
  timestamp: number;
  location?: string;
}

interface PageError {
  message: string;
  stack?: string;
  timestamp: number;
}

interface NetworkFailure {
  url: string;
  method: string;
  status: number;
  statusText: string;
  responseBody?: string;
  timestamp: number;
}

interface TestStepData {
  title: string;
  category: string;
  startTime: number;
  duration: number;
  error?: string;
  status: 'passed' | 'failed' | 'skipped';
}

interface TestContext {
  user?: string;
  conditions?: string;
  expectation?: string;
  observed?: string;
}

interface DiagnosticData {
  consoleLogs: ConsoleLog[];
  pageErrors: PageError[];
  networkFailures: NetworkFailure[];
  testContext?: TestContext;
}

interface TestOutcome {
  title: string;
  status: 'passed' | 'failed' | 'skipped';
  user: string;
  preferences: string;
  expected: string;
  observed: string;
  duration?: number;
  error?: string;
  screenshots?: string[];
  traces?: string[];
}

interface SuiteResults {
  title: string;
  outcomes: TestOutcome[];
}

interface TestReportData {
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
    timestamp: string;
    outputDirectory: string;
  };
  tests: Array<{
    title: string;
    file: string;
    status: string;
    duration: number;
    error?: string;
    errorStack?: string;
    screenshots?: string[];
    traces?: string[];
    videos?: string[];
    stdout?: string[];
    stderr?: string[];
    steps?: TestStepData[];
    consoleLogs?: ConsoleLog[];
    pageErrors?: PageError[];
    networkFailures?: NetworkFailure[];
    testContext?: TestContext;
    domSnapshot?: string;
  }>;
}

export default class SummaryReporter implements Reporter {
  private suiteResults: Map<string, SuiteResults> = new Map();
  private currentSuite: string = '';
  private isSummaryMode: boolean = false;
  private outputDir: string = '';
  private testResults: Array<any> = [];
  private startTime: number = 0;

  constructor() {
    this.isSummaryMode = process.env.TEST_SUMMARY_ONLY === 'true';
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.startTime = Date.now();

    const testFiles = new Set<string>();
    suite.allTests().forEach(test => {
      const relativePath = path.relative(process.cwd(), test.location.file);
      const fileName = path.basename(relativePath, path.extname(relativePath));
      testFiles.add(fileName);
    });

    const fileNames = Array.from(testFiles).join('-');
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace(/T/, '_')
      .split('Z')[0];

    const testRunId = process.env.TEST_RUN_ID || `${timestamp}_${fileNames}`;

    if (!process.env.TEST_RUN_ID) {
      process.env.TEST_RUN_ID = testRunId;
    }

    this.outputDir = path.join(process.cwd(), 'test-results', testRunId);

    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    if (!this.isSummaryMode) return;
  }

  onTestBegin(test: TestCase) {
    if (!this.isSummaryMode) return;

    const suiteTitle = this.getSuiteTitle(test);
    if (!this.suiteResults.has(suiteTitle)) {
      this.suiteResults.set(suiteTitle, {
        title: this.formatSuiteTitle(suiteTitle),
        outcomes: []
      });
    }
    this.currentSuite = suiteTitle;
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const testTitle = this.formatTestTitle(test.title);
    const status = result.status === 'passed' ? 'passed' : result.status === 'skipped' ? 'skipped' : 'failed';

    const expectedValue = this.extractExpected(test, result);
    const observedValue = this.extractObserved(test, result, status);

    const screenshots: string[] = [];
    const traces: string[] = [];
    const videos: string[] = [];
    let diagnosticData: DiagnosticData | undefined;
    let domSnapshot: string | undefined;

    result.attachments.forEach(attachment => {
      if (attachment.name === 'diagnostic-data' && attachment.body) {
        try {
          diagnosticData = JSON.parse(attachment.body.toString());
        } catch (err) {
        }
      }

      if (attachment.path) {
        const fileName = path.basename(attachment.path);
        const ext = path.extname(fileName).toLowerCase();

        try {
          const destPath = path.join(this.outputDir, fileName);
          if (fs.existsSync(attachment.path)) {
            fs.copyFileSync(attachment.path, destPath);

            if (ext === '.png') {
              screenshots.push(fileName);
            } else if (ext === '.zip') {
              traces.push(fileName);
            } else if (ext === '.webm') {
              videos.push(fileName);
            }
          }

          if (fileName === 'error-context.md') {
            try {
              domSnapshot = fs.readFileSync(attachment.path, 'utf-8');
            } catch (err) {
            }
          }

          if (fileName === 'dom-snapshot.html') {
            try {
              domSnapshot = fs.readFileSync(attachment.path, 'utf-8');
            } catch (err) {
            }
          }
        } catch (err) {
        }
      }
    });

    const steps: TestStepData[] = this.extractSteps(result.steps);

    const stdout: string[] = [];
    const stderr: string[] = [];

    if (result.stdout && result.stdout.length > 0) {
      result.stdout.forEach(chunk => stdout.push(chunk.toString()));
    }
    if (result.stderr && result.stderr.length > 0) {
      result.stderr.forEach(chunk => stderr.push(chunk.toString()));
    }

    const testContext: TestContext = {
      user: this.extractUser(test),
      conditions: this.extractPreferences(test),
      expectation: expectedValue,
      observed: observedValue,
    };

    const testResultData = {
      title: test.title,
      file: path.relative(process.cwd(), test.location.file),
      status,
      duration: result.duration,
      ...(result.error ? {
        error: result.error.message,
        errorStack: result.error.stack
      } : {}),
      ...(screenshots.length > 0 ? { screenshots } : {}),
      ...(traces.length > 0 ? { traces } : {}),
      ...(videos.length > 0 ? { videos } : {}),
      ...(stdout.length > 0 ? { stdout } : {}),
      ...(stderr.length > 0 ? { stderr } : {}),
      ...(steps.length > 0 ? { steps } : {}),
      ...(diagnosticData?.consoleLogs && diagnosticData.consoleLogs.length > 0 ? { consoleLogs: diagnosticData.consoleLogs } : {}),
      ...(diagnosticData?.pageErrors && diagnosticData.pageErrors.length > 0 ? { pageErrors: diagnosticData.pageErrors } : {}),
      ...(diagnosticData?.networkFailures && diagnosticData.networkFailures.length > 0 ? { networkFailures: diagnosticData.networkFailures } : {}),
      testContext,
      ...(domSnapshot ? { domSnapshot } : {})
    };

    this.testResults.push(testResultData);

    if (!this.isSummaryMode) return;

    const suite = this.suiteResults.get(this.currentSuite);
    if (!suite) return;

    const outcome: TestOutcome = {
      title: testTitle,
      status,
      user: this.extractUser(test),
      preferences: this.extractPreferences(test),
      expected: expectedValue ? expectedValue : '(empty expected)',
      observed: observedValue ? observedValue : '(empty observed)',
      duration: result.duration,
      ...(result.error ? { error: result.error.message } : {}),
      ...(screenshots.length > 0 ? { screenshots } : {}),
      ...(traces.length > 0 ? { traces } : {})
    };

    suite.outcomes.push(outcome);
  }

  async onEnd(result: FullResult) {
    const duration = Date.now() - this.startTime;
    const total = this.testResults.length;
    const passed = this.testResults.filter(t => t.status === 'passed').length;
    const failed = this.testResults.filter(t => t.status === 'failed').length;
    const skipped = this.testResults.filter(t => t.status === 'skipped').length;

    const reportData: TestReportData = {
      summary: {
        total,
        passed,
        failed,
        skipped,
        duration,
        timestamp: new Date().toISOString(),
        outputDirectory: this.outputDir
      },
      tests: this.testResults
    };

    try {
      const testResultsDir = path.join(process.cwd(), 'test-results');
      const afterallFiles = fs.readdirSync(testResultsDir)
        .filter(f => f.startsWith('afterall-call-') && f.endsWith('.json'))
        .map(f => path.join(testResultsDir, f));

      const afterallData = afterallFiles.length > 0
        ? JSON.parse(fs.readFileSync(afterallFiles[0], 'utf-8'))
        : null;

      const jsonPath = path.join(this.outputDir, 'test-report.json');
      fs.writeFileSync(jsonPath, JSON.stringify(reportData, null, 2));

      const readmePath = path.join(this.outputDir, 'README.md');
      const readmeContent = this.generateReadme(reportData, afterallData);
      fs.writeFileSync(readmePath, readmeContent);
    } catch (err) {
      console.error('Failed to write test reports:', err);
    }

    if (!this.isSummaryMode) return;

    this.suiteResults.forEach((suite) => {
      if (suite.outcomes.length === 0) return;

      const border = '='.repeat(36);
      console.log(`\n${border}`);
      console.log(suite.title);
      console.log(`${border}\n`);

      suite.outcomes.forEach((outcome, index) => {
        const icon = outcome.status === 'passed' ? '✅' : outcome.status === 'failed' ? '❌' : '⏭️';
        console.log(`${index + 1}. ${icon} ${outcome.title}`);
        console.log(`   User: ${outcome.user}`);
        console.log(`   Prefs: ${outcome.preferences}`);
        console.log(`   Expected: ${outcome.expected}`);
        console.log(`   Observed: ${outcome.observed}`);
        if (outcome.duration) {
          console.log(`   Duration: ${outcome.duration}ms`);
        }
        if (index < suite.outcomes.length - 1) {
          console.log();
        }
      });

      const suiteTotal = suite.outcomes.length;
      const suitePassed = suite.outcomes.filter(o => o.status === 'passed').length;
      const suiteFailed = suite.outcomes.filter(o => o.status === 'failed').length;

      console.log(`${border}`);
      console.log(`TOTALS: ${suiteTotal} tests | ${suitePassed} passed ✅ | ${suiteFailed} failed ❌`);
      console.log(`${border}`);
    });
  }

  private extractSteps(steps: TestStep[]): TestStepData[] {
    const extractedSteps: TestStepData[] = [];

    const processStep = (step: TestStep) => {
      extractedSteps.push({
        title: step.title,
        category: step.category,
        startTime: step.startTime.getTime(),
        duration: step.duration,
        error: step.error?.message,
        status: step.error ? 'failed' : 'passed'
      });

      if (step.steps && step.steps.length > 0) {
        step.steps.forEach(subStep => processStep(subStep));
      }
    };

    steps.forEach(step => processStep(step));
    return extractedSteps;
  }

  private generateReadme(data: TestReportData, afterallData?: any): string {
    const timestamp = new Date(data.summary.timestamp).toLocaleString();
    const durationSeconds = (data.summary.duration / 1000).toFixed(2);

    let readme = `# Test Report\n\n`;
    readme += `**Timestamp:** ${timestamp}\n`;
    readme += `**Duration:** ${durationSeconds}s\n\n`;

    readme += `## Summary\n\n`;
    readme += `- **Total:** ${data.summary.total}\n`;
    readme += `- **Passed:** ${data.summary.passed} ✅\n`;
    readme += `- **Failed:** ${data.summary.failed} ❌\n`;
    readme += `- **Skipped:** ${data.summary.skipped} ⏭️\n\n`;

    const failedTests = data.tests.filter(t => t.status === 'failed');
    if (failedTests.length > 0) {
      readme += `## Failed Tests\n\n`;
      readme += `> **Note:** For trace files, view them interactively using:\n`;
      readme += `> \`\`\`bash\n`;
      readme += `> npx playwright show-trace test-results/${path.basename(data.summary.outputDirectory)}/{trace-file}.zip\n`;
      readme += `> \`\`\`\n\n`;

      failedTests.forEach(test => {
        readme += `### ${test.title}\n\n`;
        readme += `**File:** ${test.file}\n`;
        readme += `**Duration:** ${test.duration}ms\n`;
        readme += `**Status:** ${test.error?.includes('timeout') || test.error?.includes('exceeded') ? 'TIMEOUT' : 'FAILED'}\n\n`;

        if (test.testContext) {
          readme += `**Test Setup:**\n`;
          if (test.testContext.user) {
            readme += `- **User:** ${test.testContext.user}\n`;
          }
          if (test.testContext.conditions) {
            readme += `- **Conditions:** ${test.testContext.conditions}\n`;
          }
          if (test.testContext.expectation) {
            readme += `- **Expected:** ${test.testContext.expectation}\n`;
          }
          if (test.testContext.observed) {
            readme += `- **Observed:** ${test.testContext.observed}\n`;
          }
          readme += `\n`;
        }

        if (test.steps && test.steps.length > 0) {
          readme += `**Execution Timeline:**\n\n`;
          test.steps.forEach((step, index) => {
            const icon = step.status === 'passed' ? '✓' : '✗';
            const duration = step.duration >= 0 ? `${step.duration}ms` : 'N/A';
            readme += `${index + 1}. ${icon} ${step.title} (${duration})${step.error ? ` - ${step.error}` : ''}\n`;
          });
          readme += `\n`;
        }

        if (test.error) {
          readme += `**Error Message:**\n\`\`\`\n${test.error}\n\`\`\`\n\n`;
        }

        if (test.errorStack) {
          readme += `**Stack Trace:**\n\`\`\`\n${test.errorStack}\n\`\`\`\n\n`;
        }

        if (test.consoleLogs && test.consoleLogs.length > 0) {
          const errors = test.consoleLogs.filter(log => log.type === 'error');
          const warnings = test.consoleLogs.filter(log => log.type === 'warning');
          const others = test.consoleLogs.filter(log => log.type !== 'error' && log.type !== 'warning');

          if (errors.length > 0) {
            readme += `**Browser Console Errors:**\n\`\`\`\n`;
            errors.forEach(log => {
              readme += `[${log.type.toUpperCase()}] ${log.text}\n`;
              if (log.location) {
                readme += `  Location: ${log.location}\n`;
              }
            });
            readme += `\`\`\`\n\n`;
          }

          if (warnings.length > 0) {
            readme += `**Browser Console Warnings:**\n\`\`\`\n`;
            warnings.forEach(log => {
              readme += `[${log.type.toUpperCase()}] ${log.text}\n`;
              if (log.location) {
                readme += `  Location: ${log.location}\n`;
              }
            });
            readme += `\`\`\`\n\n`;
          }

          if (others.length > 0) {
            readme += `**Browser Console Logs:**\n\`\`\`\n`;
            others.forEach(log => {
              readme += `[${log.type.toUpperCase()}] ${log.text}\n`;
              if (log.location) {
                readme += `  Location: ${log.location}\n`;
              }
            });
            readme += `\`\`\`\n\n`;
          }
        }

        if (test.pageErrors && test.pageErrors.length > 0) {
          readme += `**JavaScript Page Errors:**\n\`\`\`\n`;
          test.pageErrors.forEach(error => {
            readme += `${error.message}\n`;
            if (error.stack) {
              readme += `${error.stack}\n`;
            }
            readme += `\n`;
          });
          readme += `\`\`\`\n\n`;
        }

        if (test.networkFailures && test.networkFailures.length > 0) {
          readme += `**Network Failures:**\n\n`;
          test.networkFailures.forEach(failure => {
            readme += `- **${failure.method}** ${failure.url}\n`;
            readme += `  - Status: ${failure.status} ${failure.statusText}\n`;
            if (failure.responseBody) {
              readme += `  - Response:\n\`\`\`\n${failure.responseBody}\n\`\`\`\n`;
            }
          });
          readme += `\n`;
        }

        if (test.domSnapshot) {
          readme += `**DOM State at Failure:**\n\n`;
          const isHtml = test.domSnapshot.trim().startsWith('<!') || test.domSnapshot.trim().startsWith('<html');
          if (isHtml) {
            const maxLength = 50000;
            const truncated = test.domSnapshot.length > maxLength
              ? test.domSnapshot.substring(0, maxLength) + '\n<!-- ... truncated ... -->'
              : test.domSnapshot;
            readme += `\`\`\`html\n${truncated}\n\`\`\`\n`;
          } else {
            const snapshotLines = test.domSnapshot.split('\n');
            const contentStart = snapshotLines.findIndex(line => line.includes('```'));
            if (contentStart >= 0) {
              readme += snapshotLines.slice(contentStart).join('\n');
            } else {
              readme += `\`\`\`\n${test.domSnapshot}\n\`\`\`\n`;
            }
          }
          readme += `\n`;
        }

        if (test.stdout && test.stdout.length > 0) {
          readme += `**Console Output:**\n\`\`\`\n${test.stdout.join('')}\`\`\`\n\n`;
        }

        if (test.stderr && test.stderr.length > 0) {
          readme += `**Error Output:**\n\`\`\`\n${test.stderr.join('')}\`\`\`\n\n`;
        }

        readme += `**Artifacts:**\n\n`;

        if (test.screenshots && test.screenshots.length > 0) {
          readme += `**Screenshots:**\n`;
          test.screenshots.forEach(s => readme += `- ![${s}](${s})\n`);
          readme += `\n`;
        }

        if (test.videos && test.videos.length > 0) {
          readme += `**Videos:**\n`;
          test.videos.forEach(v => readme += `- ${v}\n`);
          readme += `\n`;
        }

        if (test.traces && test.traces.length > 0) {
          readme += `**Trace Files:**\n`;
          test.traces.forEach(t => {
            readme += `- ${t}\n`;
            readme += `  \`\`\`bash\n`;
            readme += `  npx playwright show-trace test-results/${path.basename(data.summary.outputDirectory)}/${t}\n`;
            readme += `  \`\`\`\n`;
          });
          readme += `\n`;
        }

        readme += `---\n\n`;
      });
    }

    if (afterallData && afterallData.tests && afterallData.tests.length > 0) {
      const failedTest = afterallData.tests[0];
      readme += `## Failed Sub-Test\n\n`;

      const icon = failedTest.passed ? '✓' : '✗';
      readme += `${failedTest.testNumber}. ${icon} **${failedTest.testName}**\n`;

      if (failedTest.conditions) {
        readme += `   - **Conditions:** ${failedTest.conditions}\n`;
      }
      if (failedTest.expectation) {
        readme += `   - **Expected:** ${failedTest.expectation}\n`;
      }
      if (failedTest.observed) {
        readme += `   - **Observed:** ${failedTest.observed}\n`;
      }
      if (failedTest.screenshotPath) {
        readme += `   - **Screenshot:** ${failedTest.screenshotPath}\n`;
      }
      if (failedTest.errorToast) {
        readme += `   - **Error Toast:** ${failedTest.errorToast}\n`;
      }
      readme += `\n`;

      const stats = afterallData.stats;
      readme += `**Summary:** ${stats.total} test | ${stats.passed} passed | ${stats.failed} failed\n\n`;
      readme += `---\n\n`;
    }

    readme += `## All Tests\n\n`;
    data.tests.forEach(test => {
      const icon = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏭️';
      readme += `- ${icon} **${test.title}** (${test.duration}ms)\n`;
    });

    return readme;
  }

  private getSuiteTitle(test: TestCase): string {
    const parts: string[] = [];
    let suite: Suite | undefined = test.parent;

    while (suite) {
      if (suite.title) {
        parts.unshift(suite.title);
      }
      suite = suite.parent;
    }

    return parts.slice(0, 2).join(' - ');
  }

  private formatSuiteTitle(title: string): string {
    if (title.includes('Find Partners')) {
      return 'Find Partners Pathway Test';
    }
    if (title.includes('Auth')) {
      return 'Authentication Test';
    }
    if (title.includes('Find Coaches')) {
      return 'Find Coaches Test';
    }
    if (title.includes('Booking')) {
      return 'Booking & Payment Test';
    }
    if (title.includes('Subscription')) {
      return 'Subscription Test';
    }
    if (title.includes('Courts')) {
      return 'Courts Test';
    }
    if (title.includes('Community')) {
      return 'Community Test';
    }
    if (title.includes('Messages')) {
      return 'Messages Test';
    }
    if (title.includes('Profile')) {
      return 'Profile Test';
    }
    if (title.includes('Coach Onboarding')) {
      return 'Coach Onboarding Test';
    }
    return title;
  }

  private extractUser(test: TestCase): string {
    const title = test.title;

    if (title.includes('should show nearby players when user has no saved preferences')) {
      return 'Alex Thompson (beginner, singles, casual, male, PC:2000)';
    }
    if (title.includes('should use preference-based matching')) {
      return 'David Martinez (intermediate, singles, casual, male, PC:2000)';
    }
    if (title.includes('should fall back to postcode + skill level')) {
      return 'Sophie Turner (advanced, singles, competitive, female, PC:2040)';
    }
    if (title.includes('should show no matches when neither')) {
      return 'Sophie Turner (advanced, singles, competitive, female, PC:9999)';
    }
    if (title.includes('should show beginner players')) {
      return 'David Martinez searching beginner';
    }
    if (title.includes('should show intermediate players')) {
      return 'Alex Thompson searching intermediate';
    }
    if (title.includes('should show advanced players')) {
      return 'Alex Thompson searching advanced';
    }
    if (title.includes('should match singles with singles')) {
      return 'Alex Thompson (beginner, singles)';
    }
    if (title.includes('should match doubles with doubles')) {
      return 'Marcus Brown (beginner, doubles)';
    }
    if (title.includes('should match both with all')) {
      return 'Sarah Chen (beginner, both)';
    }
    if (title.includes('should match casual with casual')) {
      return 'Alex Thompson (beginner, casual)';
    }
    if (title.includes('should match flexible with all')) {
      return 'Chris Anderson (intermediate, flexible)';
    }
    if (title.includes('should match competitive with competitive')) {
      return 'Ryan Cooper (advanced, competitive)';
    }
    if (title.includes('male seeking male')) {
      return 'Alex Thompson (male seeking male)';
    }
    if (title.includes('female seeking female')) {
      return 'Emma Wilson (female seeking female)';
    }
    if (title.includes('should show all genders')) {
      return 'Jordan Lee (no gender pref)';
    }
    if (title.includes('two-way compatibility')) {
      return 'Alex Thompson (male seeking female)';
    }
    if (title.includes('filter by UTR level')) {
      return 'David Martinez (UTR 5.5)';
    }
    if (title.includes('UTR-less users')) {
      return 'David Martinez (no UTR)';
    }
    if (title.includes('UTR players within range')) {
      return 'David Martinez (UTR 5.5)';
    }
    if (title.includes('distance to each player')) {
      return 'Alex Thompson (PC:2000)';
    }
    if (title.includes('sort profiles by distance')) {
      return 'Alex Thompson (PC:2000)';
    }
    if (title.includes('tier 2 message')) {
      return 'Sophie Turner (advanced, female, PC:2040)';
    }
    if (title.includes('no matches message')) {
      return 'Sophie Turner (advanced, female, PC:9999)';
    }
    if (title.includes('same postcode')) {
      return 'Alex Thompson (PC:2000)';
    }
    if (title.includes('postcode changes')) {
      return 'Alex Thompson (PC changes: 2000→2010)';
    }
    if (title.includes('all filters correctly')) {
      return 'Sophie Turner (advanced, singles, competitive, female, PC:2000)';
    }
    if (title.includes('skill match + at least one preference')) {
      return 'Alex Thompson (beginner, singles, casual, PC:2000)';
    }
    if (title.includes('criteria not met')) {
      return 'Sophie Turner (advanced, singles, competitive, female, PC:9999)';
    }
    if (title.includes('coach to find beginner')) {
      return 'Coach Amanda (searching beginner)';
    }
    if (title.includes('coach to find intermediate')) {
      return 'Coach Thomas (searching intermediate)';
    }
    if (title.includes('coach to find advanced')) {
      return 'Coach Isabella (searching advanced)';
    }
    if (title.includes('coach to filter by play type')) {
      return 'Coach Thomas (intermediate, doubles)';
    }
    if (title.includes('coach to change preferences')) {
      return 'Coach Amanda (changing prefs)';
    }

    return 'N/A';
  }

  private extractPreferences(test: TestCase): string {
    const title = test.title;

    if (title.includes('should show nearby players when user has no saved preferences')) {
      return 'NONE (deleted)';
    }
    if (title.includes('should use preference-based matching')) {
      return 'beginner, singles, casual, no_pref, PC:2000';
    }
    if (title.includes('should fall back to postcode + skill level')) {
      return 'advanced, singles, competitive, female, PC:2040';
    }
    if (title.includes('should show no matches when neither')) {
      return 'advanced, singles, competitive, female, PC:9999';
    }
    if (title.includes('should show beginner players')) {
      return 'beginner, singles, casual, no_pref, PC:2000';
    }
    if (title.includes('should show intermediate players')) {
      return 'intermediate, singles, casual, no_pref, PC:2000';
    }
    if (title.includes('should show advanced players')) {
      return 'advanced, singles, competitive, no_pref, PC:2000';
    }
    if (title.includes('should match singles with singles')) {
      return 'beginner, singles, casual, no_pref, PC:2000';
    }
    if (title.includes('should match doubles with doubles')) {
      return 'beginner, doubles, flexible, no_pref, PC:2010';
    }
    if (title.includes('should match both with all')) {
      return 'beginner, both, casual, no_pref, PC:2010';
    }
    if (title.includes('should match casual with casual')) {
      return 'beginner, singles, casual, no_pref, PC:2000';
    }
    if (title.includes('should match flexible with all')) {
      return 'intermediate, doubles, flexible, no_pref, PC:2030';
    }
    if (title.includes('should match competitive with competitive')) {
      return 'advanced, singles, competitive, no_pref, PC:2000';
    }
    if (title.includes('male seeking male')) {
      return 'beginner, singles, casual, male, PC:2000';
    }
    if (title.includes('female seeking female')) {
      return 'beginner, singles, casual, female, PC:2000';
    }
    if (title.includes('should show all genders')) {
      return 'beginner, singles, casual, no_pref, PC:2000';
    }
    if (title.includes('two-way compatibility')) {
      return 'beginner, singles, casual, female, PC:2000';
    }
    if (title.includes('filter by UTR level')) {
      return 'intermediate, singles, casual, no_pref, PC:2000, UTR:5.5';
    }
    if (title.includes('UTR-less users')) {
      return 'intermediate, singles, casual, no_pref, PC:2000, UTR:none';
    }
    if (title.includes('UTR players within range')) {
      return 'intermediate, singles, casual, no_pref, PC:2000, UTR:5.5';
    }
    if (title.includes('distance to each player')) {
      return 'beginner, singles, casual, no_pref, PC:2000';
    }
    if (title.includes('sort profiles by distance')) {
      return 'beginner, singles, casual, no_pref, PC:2000';
    }
    if (title.includes('tier 2 message')) {
      return 'advanced, singles, competitive, female, PC:2040';
    }
    if (title.includes('no matches message')) {
      return 'advanced, singles, competitive, female, PC:9999';
    }
    if (title.includes('same postcode')) {
      return 'beginner, singles, casual, no_pref, PC:2000';
    }
    if (title.includes('postcode changes')) {
      return 'Changing: PC:2000→2010, play:singles→both';
    }
    if (title.includes('all filters correctly')) {
      return 'advanced, singles, competitive, female, PC:2000';
    }
    if (title.includes('skill match + at least one preference')) {
      return 'beginner, singles, casual, no_pref, PC:2000';
    }
    if (title.includes('criteria not met')) {
      return 'advanced, singles, competitive, female, PC:9999';
    }
    if (title.includes('coach to find beginner')) {
      return 'beginner, singles, casual, no_pref, PC:2000';
    }
    if (title.includes('coach to find intermediate')) {
      return 'intermediate, singles, competitive, no_pref, PC:2000';
    }
    if (title.includes('coach to find advanced')) {
      return 'advanced, singles, competitive, no_pref, PC:2000';
    }
    if (title.includes('coach to filter by play type')) {
      return 'intermediate, doubles, flexible, no_pref, PC:2020';
    }
    if (title.includes('coach to change preferences')) {
      return 'Changing: PC:2000→2010, play:singles→doubles';
    }

    return 'N/A';
  }

  private formatTestTitle(title: string): string {
    if (title.includes('should show nearby players when user has no saved preferences')) {
      return 'No Preferences - Nearby players visible';
    }
    if (title.includes('should use preference-based matching')) {
      return 'Preference-based matching';
    }
    if (title.includes('should fall back to postcode')) {
      return 'Fallback to postcode matching';
    }
    if (title.includes('should show no matches when neither')) {
      return 'No matches found';
    }
    if (title.includes('should show beginner players')) {
      return 'Beginner skill level filtering';
    }
    if (title.includes('should show intermediate players')) {
      return 'Intermediate skill level filtering';
    }
    if (title.includes('should show advanced players')) {
      return 'Advanced skill level filtering';
    }
    if (title.includes('should match singles with singles')) {
      return 'Singles play type matching';
    }
    if (title.includes('should match doubles with doubles')) {
      return 'Doubles play type matching';
    }
    if (title.includes('should match both with all')) {
      return 'Both play types matching';
    }
    if (title.includes('should match casual with casual')) {
      return 'Casual session matching';
    }
    if (title.includes('should match flexible with all')) {
      return 'Flexible session matching';
    }
    if (title.includes('should match competitive with competitive')) {
      return 'Competitive session matching';
    }
    if (title.includes('gender preference')) {
      return 'Gender preference filtering';
    }
    if (title.includes('same postcode')) {
      return 'Postcode matching';
    }
    if (title.includes('postcode changes')) {
      return 'Dynamic postcode filtering';
    }
    if (title.includes('all filters correctly')) {
      return 'Combined filters';
    }
    if (title.includes('skill match + at least one preference')) {
      return 'Skill and preference matching';
    }
    if (title.includes('criteria not met')) {
      return 'No matches - criteria not met';
    }
    if (title.includes('allow coach to find beginner')) {
      return 'Coach finding beginner players';
    }
    if (title.includes('allow coach to find intermediate')) {
      return 'Coach finding intermediate players';
    }
    if (title.includes('allow coach to find advanced')) {
      return 'Coach finding advanced players';
    }
    if (title.includes('coach to filter by play type')) {
      return 'Coach filtering by play type';
    }
    if (title.includes('coach to change preferences')) {
      return 'Coach changing preferences';
    }

    return title.substring(0, 50);
  }

  private extractExpected(test: TestCase, result: TestResult): string {
    const title = test.title;

    if (title.includes('should show nearby players when user has no saved preferences')) {
      return 'Nearby players (Emma Wilson, Jordan Lee) should be visible; Self (Alex Thompson) should not be visible';
    }
    if (title.includes('nearby players')) {
      return 'Nearby players should be visible when no preferences are set';
    }
    if (title.includes('preference-based matching')) {
      return 'Players matching exact preferences should be visible';
    }
    if (title.includes('fall back to postcode')) {
      return 'Players in same postcode with same skill level should be visible';
    }
    if (title.includes('no matches when neither')) {
      return 'No players should be visible when criteria not met';
    }
    if (title.includes('beginner players')) {
      return 'Only beginner level players should be visible';
    }
    if (title.includes('intermediate players')) {
      return 'Only intermediate level players should be visible';
    }
    if (title.includes('advanced players')) {
      return 'Only advanced level players should be visible';
    }
    if (title.includes('singles with singles')) {
      return 'Singles players should match with singles and both';
    }
    if (title.includes('doubles with doubles')) {
      return 'Doubles players should match with doubles and both';
    }
    if (title.includes('both with all')) {
      return 'Both play type should match with all types';
    }
    if (title.includes('casual with casual')) {
      return 'Casual players should match with casual and flexible';
    }
    if (title.includes('flexible with all')) {
      return 'Flexible players should match with all session types';
    }
    if (title.includes('competitive with competitive')) {
      return 'Competitive players should match with competitive and flexible';
    }
    if (title.includes('gender preference')) {
      return 'Players should be shown regardless of gender preference';
    }
    if (title.includes('same postcode')) {
      return 'Only players from the same postcode should be visible';
    }
    if (title.includes('postcode changes')) {
      return 'Different players should appear when postcode changes';
    }
    if (title.includes('all filters')) {
      return 'All filter criteria should be applied correctly';
    }
    if (title.includes('skill match')) {
      return 'Skill level must match with at least one other preference';
    }
    if (title.includes('criteria not met')) {
      return 'No matches should appear when criteria not met';
    }
    if (title.includes('coach to find beginner')) {
      return 'Coach should see beginner level players';
    }
    if (title.includes('coach to find intermediate')) {
      return 'Coach should see intermediate level players';
    }
    if (title.includes('coach to find advanced')) {
      return 'Coach should see advanced level players';
    }
    if (title.includes('coach to filter')) {
      return 'Coach should be able to filter by play type';
    }
    if (title.includes('coach to change')) {
      return 'Coach should see different results when preferences change';
    }

    return 'Test should pass as expected';
  }

  private extractObserved(test: TestCase, result: TestResult, status: 'passed' | 'failed' | 'skipped'): string {
    if (status === 'skipped') {
      return 'Test was skipped';
    }

    if (result.error) {
      const errorMsg = result.error.message || '';
      if (errorMsg.includes('Test timeout') || errorMsg.includes('exceeded')) {
        return 'Test timed out';
      }
    }

    const title = test.title;
    const passed = status === 'passed';

    if (title.includes('should show nearby players when user has no saved preferences')) {
      return passed ? 'Emma Wilson and Jordan Lee are visible; Alex Thompson is not visible' : 'Expected players not found or visibility incorrect';
    }
    if (title.includes('nearby players')) {
      return passed ? 'Nearby players are visible' : 'Nearby players not found';
    }
    if (title.includes('preference-based matching')) {
      return passed ? 'Preference-matched players are visible' : 'Expected players not found';
    }
    if (title.includes('fall back to postcode')) {
      return passed ? 'Postcode-matched players are visible' : 'Expected players not found';
    }
    if (title.includes('no matches when neither')) {
      return passed ? 'No players are visible' : 'Unexpected players found';
    }
    if (title.includes('beginner players')) {
      return passed ? 'Beginner players are visible' : 'Expected skill level not found';
    }
    if (title.includes('intermediate players')) {
      return passed ? 'Intermediate players are visible' : 'Expected skill level not found';
    }
    if (title.includes('advanced players')) {
      return passed ? 'Advanced players are visible' : 'Expected skill level not found';
    }
    if (title.includes('singles with singles')) {
      return passed ? 'Singles matching works correctly' : 'Singles matching failed';
    }
    if (title.includes('doubles with doubles')) {
      return passed ? 'Doubles matching works correctly' : 'Doubles matching failed';
    }
    if (title.includes('both with all')) {
      return passed ? 'Both play type matching works' : 'Play type matching failed';
    }
    if (title.includes('casual with casual')) {
      return passed ? 'Casual session matching works' : 'Session matching failed';
    }
    if (title.includes('flexible with all')) {
      return passed ? 'Flexible session matching works' : 'Session matching failed';
    }
    if (title.includes('competitive with competitive')) {
      return passed ? 'Competitive session matching works' : 'Session matching failed';
    }
    if (title.includes('gender preference')) {
      return passed ? 'Gender preference filtering works' : 'Gender filtering failed';
    }
    if (title.includes('same postcode')) {
      return passed ? 'Postcode filtering works correctly' : 'Postcode filtering failed';
    }
    if (title.includes('postcode changes')) {
      return passed ? 'Dynamic postcode filtering works' : 'Postcode change failed';
    }
    if (title.includes('all filters')) {
      return passed ? 'Combined filters work correctly' : 'Filter combination failed';
    }
    if (title.includes('skill match')) {
      return passed ? 'Skill and preference matching works' : 'Matching criteria failed';
    }
    if (title.includes('criteria not met')) {
      return passed ? 'No matches shown correctly' : 'Unexpected matches found';
    }
    if (title.includes('coach to find beginner')) {
      return passed ? 'Coach can see beginner players' : 'Beginner players not visible';
    }
    if (title.includes('coach to find intermediate')) {
      return passed ? 'Coach can see intermediate players' : 'Intermediate players not visible';
    }
    if (title.includes('coach to find advanced')) {
      return passed ? 'Coach can see advanced players' : 'Advanced players not visible';
    }
    if (title.includes('coach to filter')) {
      return passed ? 'Coach filtering works correctly' : 'Coach filtering failed';
    }
    if (title.includes('coach to change')) {
      return passed ? 'Coach preference changes work' : 'Preference change failed';
    }

    if (result.error) {
      const errorMsg = result.error.message || '';
      if (errorMsg.includes('not found')) {
        return 'Element not found on page';
      }
      if (errorMsg.includes('timeout')) {
        return 'Test timed out waiting for element';
      }
      if (errorMsg.includes('visible')) {
        return 'Element visibility check failed';
      }
      return `Test failed: ${errorMsg.substring(0, 50)}`;
    }

    return passed ? 'Test passed successfully' : 'Test failed';
  }
}