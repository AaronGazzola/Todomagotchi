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

class MinimalReporter implements Reporter {
  private testCount = 0;

  onBegin(config: FullConfig, suite: Suite) {
    process.stdout.write("\n");
  }

  onTestEnd(test: TestCase, result: TestResult) {
    this.testCount++;
    const status = result.status === "passed" ? "✓" : "✗";
    process.stdout.write(`${status}   ${this.testCount} …${test.title}\n`);
  }

  onEnd(result: FullResult) {
    const testResultsDir = path.join(process.cwd(), "test-results");
    if (!fs.existsSync(testResultsDir)) {
      return;
    }

    const files = fs
      .readdirSync(testResultsDir)
      .filter((f) => f.startsWith("afterall-call-") && f.endsWith(".json"));

    if (files.length === 0) {
      process.stdout.write("\n");
      return;
    }

    let allTests: any[] = [];
    let totalPassed = 0;
    let totalFailed = 0;

    files.forEach((file) => {
      const filePath = path.join(testResultsDir, file);
      const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));

      totalPassed += content.stats.passed || 0;
      totalFailed += content.stats.failed || 0;

      if (content.tests && Array.isArray(content.tests)) {
        allTests = allTests.concat(content.tests);
      }

      fs.unlinkSync(filePath);
    });

    const total = totalPassed + totalFailed;
    process.stdout.write(`\n${total} tests | ${totalPassed} passed | ${totalFailed} failed\n`);

    if (totalFailed > 0) {
      process.stdout.write("\nFailed Tests:\n\n");

      allTests.forEach((test, index) => {
        if (!test.passed) {
          process.stdout.write(`${index + 1}. ${test.description}\n`);
          process.stdout.write(`   Conditions: ${test.conditions}\n`);
          process.stdout.write(`   Expected: ${test.expected}\n`);
          process.stdout.write(`   Observed: ${test.observed}\n`);
          if (test.screenshot) {
            process.stdout.write(`   Screenshot: ${test.screenshot}\n`);
          }
          if (test.errorToast) {
            process.stdout.write(`   Error Toast: ${test.errorToast}\n`);
          }
          process.stdout.write("\n");
        }
      });
    }

    process.stdout.write("\n");
  }
}

export default MinimalReporter;
