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
    screenshots: string[];
    videos: string[];
    traces: string[];
  }> = [];

  onBegin(config: FullConfig, suite: Suite) {
    this.outputDir = config.projects[0].outputDir;
    fs.mkdirSync(this.outputDir, { recursive: true });
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const screenshots: string[] = [];
    const videos: string[] = [];
    const traces: string[] = [];

    result.attachments.forEach((attachment) => {
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
      screenshots,
      videos,
      traces,
    });
  }

  onEnd(result: FullResult) {
    const passed = this.testResults.filter((t) => t.status === "passed").length;
    const failed = this.testResults.filter((t) => t.status !== "passed" && t.status !== "skipped").length;
    const skipped = this.testResults.filter(
      (t) => t.status === "skipped"
    ).length;

    const report = {
      summary: {
        total: this.testResults.length,
        passed,
        failed,
        skipped,
        duration: this.testResults.reduce((sum, t) => sum + t.duration, 0),
        timestamp: new Date().toISOString(),
        outputDirectory: this.outputDir,
      },
      tests: this.testResults.map((test) => ({
        title: test.title,
        file: test.file,
        status: test.status,
        duration: test.duration,
        ...(test.error && { error: test.error }),
        ...(test.screenshots.length > 0 && { screenshots: test.screenshots }),
        ...(test.videos.length > 0 && { videos: test.videos }),
        ...(test.traces.length > 0 && { traces: test.traces }),
      })),
    };

    const reportPath = path.join(this.outputDir, "test-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    const readmePath = path.join(this.outputDir, "README.md");
    const readme = this.generateReadme(report);
    fs.writeFileSync(readmePath, readme);

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
          lines.push(`**Duration:** ${(test.duration / 1000).toFixed(2)}s`);
          lines.push(``);

          if (test.error) {
            lines.push(`**Error:**`, "```", test.error, "```", ``);
          }

          if (test.screenshots?.length > 0) {
            lines.push(`**Screenshots:**`);
            test.screenshots.forEach((s: string) => {
              lines.push(`- [${s}](${s})`);
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

          if (test.traces?.length > 0) {
            lines.push(`**Traces:**`);
            test.traces.forEach((t: string) => {
              lines.push(`- [${t}](${t})`);
            });
            lines.push(``);
          }
        });
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
