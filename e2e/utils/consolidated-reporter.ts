import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from "@playwright/test/reporter";
import * as fs from "fs";
import * as path from "path";

class ConsolidatedReporter implements Reporter {
  private outputDir: string = "";
  private testResults: Array<{
    title: string;
    file: string;
    status: string;
    duration: number;
    error?: string;
    errorStack?: string;
    screenshots: string[];
    videos: string[];
    traces: string[];
    diagnosticData?: any;
  }> = [];
  private currentTestNumber: number = 0;
  private totalTests: number = 0;
  private startTime: string = "";

  onBegin(config: FullConfig, suite: Suite) {
    this.startTime = new Date().toISOString();

    const timestamp = new Date()
      .toISOString()
      .replace(/T/, "_")
      .replace(/:/g, "-")
      .replace(/\..+/, "")
      .split("Z")[0];
    const milliseconds = new Date().getMilliseconds().toString().padStart(3, "0");
    const testFileName = suite.title
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    const testRunId = `${timestamp}-${milliseconds}_${testFileName}`;

    process.env.TEST_RUN_ID = testRunId;

    this.outputDir = path.join("test-results", testRunId);
    fs.mkdirSync(this.outputDir, { recursive: true });

    this.totalTests = suite.allTests().length;

    if (process.env.TEST_SUMMARY_ONLY === "true") {
      console.log(`\nRunning ${this.totalTests} tests using ${config.workers || 1} worker${config.workers === 1 ? '' : 's'}\n`);
    } else {
      console.log(`\nRunning ${this.totalTests} tests\n`);
    }
  }

  onTestBegin(test: TestCase) {
    this.currentTestNumber++;
    if (process.env.TEST_SUMMARY_ONLY !== "true") {
      console.log(`\n[${this.currentTestNumber}/${this.totalTests}] ${test.title}`);
    }
  }

  onStepBegin(test: TestCase, result: TestResult, step: any) {
    if (process.env.TEST_SUMMARY_ONLY !== "true" && step.category === "test.step") {
      console.log(`  → ${step.title}`);
    }
  }

  onStepEnd(test: TestCase, result: TestResult, step: any) {
    if (process.env.TEST_SUMMARY_ONLY !== "true" && step.category === "test.step") {
      const statusIcon = step.error ? "✗" : "✓";
      const duration = (step.duration / 1000).toFixed(1);
      console.log(`  ${statusIcon} ${step.title} (${duration}s)`);
      if (step.error) {
        console.log(`    Error: ${step.error.message?.split('\n')[0] || 'Unknown error'}`);
      }
    }
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const screenshots: string[] = [];
    const videos: string[] = [];
    const traces: string[] = [];
    let diagnosticData: any = null;

    result.attachments.forEach((attachment) => {
      if (attachment.name === "diagnostic-data" && attachment.body) {
        try {
          diagnosticData = JSON.parse(attachment.body.toString());
        } catch (e) {
          console.error("Failed to parse diagnostic data:", e);
        }
      }

      if (attachment.path) {
        const fileName = path.basename(attachment.path);
        const destPath = path.join(this.outputDir, fileName);

        try {
          fs.copyFileSync(attachment.path, destPath);

          if (attachment.name === "screenshot" || fileName.endsWith(".png")) {
            screenshots.push(fileName);
          } else if (
            attachment.name === "video" ||
            fileName.endsWith(".webm")
          ) {
            videos.push(fileName);
          } else if (attachment.name === "trace" || fileName.endsWith(".zip")) {
            traces.push(fileName);
          }
        } catch (error) {
          console.error(`Failed to copy ${attachment.path}:`, error);
        }
      }
    });

    this.testResults.push({
      title: test.title,
      file: path.relative(process.cwd(), test.location.file),
      status: result.status,
      duration: result.duration,
      error: result.error?.message,
      errorStack: result.error?.stack,
      screenshots,
      videos,
      traces,
      diagnosticData,
    });

    if (process.env.TEST_SUMMARY_ONLY === "true") {
      const statusIcon = result.status === "passed" ? "✓" : "✗";
      const duration = (result.duration / 1000).toFixed(1);
      const title = test.title.length > 40 ? test.title.slice(0, 40) : test.title;
      const ellipsis = test.title.length > 40 ? "…" : " ";
      console.log(`  ${statusIcon}  ${this.currentTestNumber} ${ellipsis}${title} (${duration}s)`);
    } else {
      const statusIcon = result.status === "passed" ? "✓" : "✗";
      const duration = (result.duration / 1000).toFixed(1);
      console.log(`  ${statusIcon} ${test.title} (${duration}s)`);

      if (result.status !== "passed") {
        if (result.error?.message) {
          console.log(`    Error: ${result.error.message.split('\n')[0]}`);
        }
      }
    }
  }

  onEnd(result: FullResult) {
    const passed = this.testResults.filter((t) => t.status === "passed").length;
    const failed = this.testResults.filter((t) => t.status !== "passed" && t.status !== "skipped").length;
    const skipped = this.testResults.filter(
      (t) => t.status === "skipped"
    ).length;

    const subTestData = this.readSubTestData();

    const report = {
      summary: {
        total: this.testResults.length,
        passed,
        failed,
        skipped,
        duration: this.testResults.reduce((sum, t) => sum + t.duration, 0),
        timestamp: this.startTime,
        endTime: new Date().toISOString(),
        outputDirectory: this.outputDir,
      },
      tests: this.testResults.map((test) => ({
        title: test.title,
        file: test.file,
        status: test.status,
        duration: test.duration,
        ...(test.error && { error: test.error }),
        ...(test.errorStack && { errorStack: test.errorStack }),
        ...(test.screenshots.length > 0 && { screenshots: test.screenshots }),
        ...(test.videos.length > 0 && { videos: test.videos }),
        ...(test.traces.length > 0 && { traces: test.traces }),
        ...(test.diagnosticData && { diagnosticData: test.diagnosticData }),
      })),
      subTests: subTestData,
    };

    const reportPath = path.join(this.outputDir, "test-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    const readmePath = path.join(this.outputDir, "README.md");
    const readme = this.generateReadme(report);
    fs.writeFileSync(readmePath, readme);

    if (process.env.TEST_SUMMARY_ONLY === "true") {
      if (subTestData.tests && subTestData.tests.length > 0) {
        console.log("\n📊 Test Logger Summary:");
        const summary = this.formatSubTestSummary(subTestData);
        console.log(summary);
      }
    }

    console.log(`\n📊 Test report generated: ${this.outputDir}`);
    console.log(`   - test-report.json (complete data)`);
    console.log(`   - README.md (human-readable summary)`);
    if (failed > 0) {
      const artifactCount = this.testResults.reduce(
        (sum, t) => sum + t.screenshots.length + t.videos.length + t.traces.length,
        0
      );
      console.log(`   - ${artifactCount} artifacts`);
    }
  }

  private readSubTestData(): any {
    try {
      const testResultsDir = path.join(process.cwd(), "test-results");
      const files = fs.readdirSync(testResultsDir);
      const afterallFiles = files.filter(f => f.startsWith("afterall-call-") && f.endsWith(".json"));

      if (afterallFiles.length === 0) {
        return { tests: [] };
      }

      const latestFile = afterallFiles.sort().pop();
      if (!latestFile) {
        return { tests: [] };
      }

      const filePath = path.join(testResultsDir, latestFile);
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      return { tests: [] };
    }
  }

  private formatSubTestSummary(subTestData: any): string {
    if (!subTestData.tests || subTestData.tests.length === 0) {
      return "";
    }

    const failedTests = subTestData.tests.filter((t: any) => !t.passed);
    let summary = `\n${subTestData.stats?.total || 0} test | ${subTestData.stats?.passed || 0} passed | ${subTestData.stats?.failed || 0} failed\n`;

    if (failedTests.length > 0) {
      summary += `\nFailed Assertions:\n`;
      failedTests.forEach((test: any) => {
        summary += `  ${test.testNumber.toString().padStart(3, "0")}. ${test.testName}\n`;
        if (test.conditions) {
          summary += `    Conditions: ${test.conditions}\n`;
        }
        if (test.expectation) {
          summary += `    Expected: ${test.expectation}\n`;
        }
        if (test.observed) {
          summary += `    Observed: ${test.observed}\n`;
        }
      });
    }

    return summary;
  }

  private generateReadme(report: any): string {
    const lines = [
      `# Test Report`,
      ``,
      `**Timestamp:** ${report.summary.timestamp}`,
      `**Total Duration:** ${(report.summary.duration / 1000).toFixed(2)}s`,
      ``,
      `## Summary`,
      ``,
      `- ✅ Passed: ${report.summary.passed}`,
      `- ❌ Failed: ${report.summary.failed}`,
      `- ⏭️  Skipped: ${report.summary.skipped}`,
      `- 📊 Total: ${report.summary.total}`,
      ``,
    ];

    if (report.summary.failed > 0) {
      lines.push(`## Failed Tests`, ``);
      report.tests
        .filter((t: any) => t.status !== "passed" && t.status !== "skipped")
        .forEach((test: any) => {
          lines.push(`### ${test.title}`, ``);
          lines.push(`**File:** ${test.file}`);
          lines.push(`**Duration:** ${test.duration}ms`);
          lines.push(`**Status:** ${test.status.toUpperCase()}`);
          lines.push(``);

          if (test.diagnosticData?.testContext) {
            lines.push(`**Test Setup:**`, ``);
            const ctx = test.diagnosticData.testContext;
            if (ctx.user) lines.push(`- **User:** ${ctx.user}`);
            if (ctx.conditions) lines.push(`- **Conditions:** ${ctx.conditions}`);
            if (ctx.expectation) lines.push(`- **Expected:** ${ctx.expectation}`);
            if (ctx.observed) lines.push(`- **Observed:** ${ctx.observed}`);
            lines.push(``);
          }

          if (test.error) {
            lines.push(`**Error Message:**`, "```", test.error, "```", ``);
          }

          if (test.errorStack) {
            lines.push(`**Stack Trace:**`, "```", test.errorStack, "```", ``);
          }

          if (test.diagnosticData?.consoleLogs?.length > 0) {
            const errors = test.diagnosticData.consoleLogs.filter((log: any) => log.type === "error");
            if (errors.length > 0) {
              lines.push(`**Browser Console Errors:**`, "```");
              errors.forEach((log: any) => {
                lines.push(`[${log.type.toUpperCase()}] ${log.text}`);
                if (log.location) lines.push(`Location: ${log.location}`);
              });
              lines.push("```", ``);
            }
          }

          if (test.diagnosticData?.networkFailures?.length > 0) {
            lines.push(`**Network Failures:**`, ``);
            test.diagnosticData.networkFailures.forEach((failure: any) => {
              lines.push(`- **${failure.method}** ${failure.url}`);
              lines.push(`  - Status: ${failure.status} ${failure.statusText}`);
              if (failure.responseBody) {
                lines.push(`  - Response:`, "```", failure.responseBody, "```");
              }
            });
            lines.push(``);
          }

          if (test.diagnosticData?.pageErrors?.length > 0) {
            lines.push(`**Page Errors:**`, "```");
            test.diagnosticData.pageErrors.forEach((error: any) => {
              lines.push(error.message);
              if (error.stack) lines.push(error.stack);
            });
            lines.push("```", ``);
          }

          lines.push(`**Artifacts:**`, ``);

          if (test.screenshots?.length > 0) {
            lines.push(`**Screenshots:**`);
            test.screenshots.forEach((s: string) => {
              lines.push(`- ![${s}](${s})`);
            });
            lines.push(``);
          }

          if (test.traces?.length > 0) {
            lines.push(`**Trace Files:**`);
            test.traces.forEach((t: string) => {
              lines.push(`- ${t}`);
              lines.push(`  \`\`\`bash`);
              lines.push(`  npx playwright show-trace ${report.summary.outputDirectory}/${t}`);
              lines.push(`  \`\`\``);
            });
            lines.push(``);
          }

          if (test.videos?.length > 0) {
            lines.push(`**Videos:**`);
            test.videos.forEach((v: string) => {
              lines.push(`- [${v}](${v})`);
            });
            lines.push(``);
          }
        });
    }

    if (report.subTests?.tests && report.subTests.tests.length > 0) {
      const failedSubTests = report.subTests.tests.filter((t: any) => !t.passed);
      if (failedSubTests.length > 0) {
        lines.push(`## Failed Sub-Tests`, ``);
        failedSubTests.forEach((test: any) => {
          lines.push(`### ${test.testNumber}. ${test.testName}`, ``);
          if (test.conditions) {
            lines.push(`**Conditions:** ${test.conditions}`);
          }
          if (test.expectation) {
            lines.push(`**Expected:** ${test.expectation}`);
          }
          if (test.observed) {
            lines.push(`**Observed:** ${test.observed}`);
          }
          if (test.screenshotPath) {
            lines.push(`**Screenshot:** ${test.screenshotPath}`);
          }
          if (test.errorToast) {
            lines.push(`**Error Toast:** ${test.errorToast}`);
          }
          lines.push(``);
        });
      }
    }

    lines.push(`## All Tests`, ``);
    report.tests.forEach((test: any) => {
      const icon = test.status === "passed" ? "✅" : "❌";
      lines.push(
        `${icon} **${test.title}** - ${(test.duration / 1000).toFixed(2)}s`
      );
    });

    return lines.join("\n");
  }
}

export default ConsolidatedReporter;
