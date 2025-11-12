import fs from "fs";
import path from "path";

interface TestSuite {
  name: string;
  fileName: string;
  command: string;
}

interface CleanupStats {
  directoriesDeleted: number;
  jsonFilesDeleted: number;
  reportFilesDeleted: number;
  totalSizeFreed: number;
}

function parseTestsFromDocsFile(): TestSuite[] {
  const testsDocPath = path.join(process.cwd(), "docs", "Tests.md");
  const content = fs.readFileSync(testsDocPath, "utf-8");

  const testSuites: TestSuite[] = [];
  const indexSection = content.split("## Test Index")[1]?.split("---")[0];

  if (!indexSection) {
    throw new Error("Could not find Test Index section in Tests.md");
  }

  const lines = indexSection.split("\n");

  for (const line of lines) {
    const matchSpec = line.match(/\[([^\]]+)\].*\]\(([^\)]+\.spec\.ts)\)/);
    const matchTest = line.match(/\[([^\]]+)\].*\]\(([^\)]+\.test\.ts)\)/);
    const match = matchSpec || matchTest;

    if (match) {
      const name = match[1];
      const fileName = match[2].replace("e2e/", "").replace("__tests__/", "");

      const commandMatch = line.match(/`(npm run [^`]+)`/);
      const command = commandMatch ? commandMatch[1] : "";

      testSuites.push({ name, fileName, command });
    }
  }

  return testSuites;
}

function findLatestTestResultDir(fileName: string): string | null {
  const testResultsDir = path.join(process.cwd(), "test-results");

  if (!fs.existsSync(testResultsDir)) {
    return null;
  }

  const pattern = fileName.replace(/\.(spec|test)\.ts$/, "");
  const timestampedDirPattern = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}_/;

  const dirs = fs
    .readdirSync(testResultsDir)
    .filter((dir) => {
      const dirPath = path.join(testResultsDir, dir);
      return (
        fs.statSync(dirPath).isDirectory() &&
        dir.includes(pattern) &&
        timestampedDirPattern.test(dir)
      );
    })
    .sort()
    .reverse();

  return dirs.length > 0 ? path.join(testResultsDir, dirs[0]) : null;
}

function extractReadmeContent(dirPath: string): string | null {
  const readmePath = path.join(dirPath, "README.md");

  if (!fs.existsSync(readmePath)) {
    return null;
  }

  return fs.readFileSync(readmePath, "utf-8");
}

interface JestTestResult {
  testNumber?: number;
  testName: string;
  passed: boolean;
  timestamp: string;
  conditions?: string;
  expectation?: string;
  observed?: string;
  duration?: number;
}

interface JestOutputData {
  timestamp: string;
  callId: number;
  stats: {
    total: number;
    passed: number;
    failed: number;
  };
  testsCount: number;
  tests: JestTestResult[];
  testSuiteName: string;
}

function findJestTestResults(testSuiteName: string): {
  stats: { total: number; passed: number; failed: number; skipped: number };
  tests: JestTestResult[];
  timestamp: string;
} | null {
  const testResultsDir = path.join(process.cwd(), "test-results");

  if (!fs.existsSync(testResultsDir)) {
    return null;
  }

  const files = fs
    .readdirSync(testResultsDir)
    .filter((file) => file.startsWith("afterall-call-") && file.endsWith(".json"));

  if (files.length === 0) {
    return null;
  }

  const resultsForSuite: JestOutputData[] = [];

  for (const file of files) {
    try {
      const filePath = path.join(testResultsDir, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const data: JestOutputData = JSON.parse(content);

      if (data.testSuiteName === testSuiteName) {
        resultsForSuite.push(data);
      }
    } catch (error) {
      continue;
    }
  }

  if (resultsForSuite.length === 0) {
    return null;
  }

  resultsForSuite.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const latestResult = resultsForSuite[0];

  const allTests: JestTestResult[] = [];
  let totalPassed = 0;
  let totalFailed = 0;

  for (const result of resultsForSuite) {
    if (new Date(result.timestamp).getTime() === new Date(latestResult.timestamp).getTime()) {
      allTests.push(...result.tests);
      totalPassed += result.stats.passed;
      totalFailed += result.stats.failed;
    }
  }

  return {
    stats: {
      total: allTests.length,
      passed: totalPassed,
      failed: totalFailed,
      skipped: 0,
    },
    tests: allTests,
    timestamp: latestResult.timestamp,
  };
}

function getDirectorySize(dirPath: string): number {
  let totalSize = 0;

  function calculateSize(currentPath: string) {
    const stats = fs.statSync(currentPath);

    if (stats.isFile()) {
      totalSize += stats.size;
    } else if (stats.isDirectory()) {
      const files = fs.readdirSync(currentPath);
      for (const file of files) {
        calculateSize(path.join(currentPath, file));
      }
    }
  }

  calculateSize(dirPath);
  return totalSize;
}

function cleanupOldTestResults(): CleanupStats {
  const testResultsDir = path.join(process.cwd(), "test-results");
  const stats: CleanupStats = {
    directoriesDeleted: 0,
    jsonFilesDeleted: 0,
    reportFilesDeleted: 0,
    totalSizeFreed: 0,
  };

  if (!fs.existsSync(testResultsDir)) {
    return stats;
  }

  const timestampedDirPattern = /^(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3})_(.+)$/;
  const allEntries = fs.readdirSync(testResultsDir);

  const testGroups = new Map<string, Array<{ fullName: string; timestamp: string }>>();

  for (const entry of allEntries) {
    const match = entry.match(timestampedDirPattern);
    if (match) {
      const timestamp = match[1];
      const testName = match[2];

      if (!testGroups.has(testName)) {
        testGroups.set(testName, []);
      }

      testGroups.get(testName)!.push({ fullName: entry, timestamp });
    }
  }

  for (const [testName, entries] of testGroups) {
    entries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    for (let i = 1; i < entries.length; i++) {
      const dirPath = path.join(testResultsDir, entries[i].fullName);
      const dirSize = getDirectorySize(dirPath);

      fs.rmSync(dirPath, { recursive: true, force: true });
      stats.directoriesDeleted++;
      stats.totalSizeFreed += dirSize;
    }
  }

  const remainingTestSuites = new Set<string>();
  for (const [testName] of testGroups) {
    remainingTestSuites.add(testName);
  }

  const jsonFiles = allEntries.filter(
    (entry) => entry.startsWith("afterall-call-") && entry.endsWith(".json")
  );

  for (const jsonFile of jsonFiles) {
    try {
      const filePath = path.join(testResultsDir, jsonFile);
      const content = fs.readFileSync(filePath, "utf-8");
      const data = JSON.parse(content);

      const testSuiteName = data.testSuiteName;
      let shouldKeep = false;

      for (const testName of remainingTestSuites) {
        if (testName.includes(testSuiteName) || testSuiteName.includes(testName)) {
          shouldKeep = true;
          break;
        }
      }

      if (!shouldKeep) {
        const fileSize = fs.statSync(filePath).size;
        fs.unlinkSync(filePath);
        stats.jsonFilesDeleted++;
        stats.totalSizeFreed += fileSize;
      }
    } catch (error) {
      continue;
    }
  }

  return stats;
}

function cleanupOldTestReports(stats: CleanupStats): void {
  const reportsDir = path.join(process.cwd(), "docs", "test-reports");

  if (!fs.existsSync(reportsDir)) {
    return;
  }

  const reportPattern = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}-\d{3}\.md$/;
  const allReports = fs.readdirSync(reportsDir)
    .filter(file => reportPattern.test(file))
    .sort()
    .reverse();

  for (let i = 1; i < allReports.length; i++) {
    const reportPath = path.join(reportsDir, allReports[i]);
    const fileSize = fs.statSync(reportPath).size;
    fs.unlinkSync(reportPath);
    stats.reportFilesDeleted++;
    stats.totalSizeFreed += fileSize;
  }
}

function formatJestResultsAsReadme(
  jestResults: {
    stats: { total: number; passed: number; failed: number; skipped: number };
    tests: JestTestResult[];
    timestamp: string;
  },
  suite: TestSuite
): string {
  let content = `## All Tests\n\n`;

  for (const test of jestResults.tests) {
    const icon = test.passed ? "✅" : "❌";
    content += `- ${icon} **${test.testName}**`;
    if (test.duration) {
      content += ` (${test.duration}ms)`;
    }
    content += `\n`;
  }

  return content;
}

interface TestSuiteStatus {
  suite: TestSuite;
  status: "passed" | "failed" | "no-results";
  stats?: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  latestDir?: string;
  readmeContent?: string;
}

function generateConsolidatedReport(): void {
  const testSuites = parseTestsFromDocsFile();
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace(/T/, "_")
    .split("Z")[0];

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let suitesWithResults = 0;
  let suitesWithoutResults = 0;

  const suiteStatuses: TestSuiteStatus[] = [];

  for (const suite of testSuites) {
    let suiteStatus: TestSuiteStatus = {
      suite,
      status: "no-results",
    };

    const latestDir = findLatestTestResultDir(suite.fileName);

    if (latestDir) {
      const readmeContent = extractReadmeContent(latestDir);

      if (readmeContent) {
        const summaryMatch = readmeContent.match(
          /- \*\*Total:\*\* (\d+)\n- \*\*Passed:\*\* (\d+) ✅\n- \*\*Failed:\*\* (\d+) ❌\n- \*\*Skipped:\*\* (\d+) ⏭️/
        );

        if (summaryMatch) {
          const total = parseInt(summaryMatch[1]);
          const passed = parseInt(summaryMatch[2]);
          const failed = parseInt(summaryMatch[3]);
          const skipped = parseInt(summaryMatch[4]);

          totalTests += total;
          totalPassed += passed;
          totalFailed += failed;
          totalSkipped += skipped;
          suitesWithResults++;

          suiteStatus = {
            suite,
            status: failed > 0 ? "failed" : "passed",
            stats: { total, passed, failed, skipped },
            latestDir,
            readmeContent,
          };
        } else {
          suitesWithoutResults++;
        }
      } else {
        suitesWithoutResults++;
      }
    } else {
      const pattern = suite.fileName.replace(/\.(spec|test)\.ts$/, "");
      const jestResults = findJestTestResults(pattern);

      if (jestResults) {
        totalTests += jestResults.stats.total;
        totalPassed += jestResults.stats.passed;
        totalFailed += jestResults.stats.failed;
        totalSkipped += jestResults.stats.skipped;
        suitesWithResults++;

        const readmeContent = formatJestResultsAsReadme(jestResults, suite);

        suiteStatus = {
          suite,
          status: jestResults.stats.failed > 0 ? "failed" : "passed",
          stats: jestResults.stats,
          readmeContent,
        };
      } else {
        suitesWithoutResults++;
      }
    }

    suiteStatuses.push(suiteStatus);
  }

  let reportContent = `# Consolidated Test Report\n\n`;
  reportContent += `**Generated:** ${new Date().toLocaleString()}\n\n`;
  reportContent += `---\n\n`;

  reportContent += `## Test Status Overview\n\n`;
  for (const { suite, status } of suiteStatuses) {
    const icon = status === "passed" ? "✅" : status === "failed" ? "❌" : "⭕";
    reportContent += `${icon} **${suite.name}** (\`${suite.fileName}\`; \`${suite.command}\`)\n`;
  }
  reportContent += `\n---\n\n`;

  for (const suiteStatus of suiteStatuses) {
    const { suite, status, stats, latestDir, readmeContent } = suiteStatus;
    reportContent += `## ${suite.name}\n\n`;
    reportContent += `**File:** \`${suite.fileName}\`\n\n`;
    reportContent += `**Run Command:**\n\`\`\`bash\n${suite.command}\n\`\`\`\n\n`;

    if (status === "no-results") {
      reportContent += `⚠️ No test results found\n\n`;
    } else if (stats && latestDir && readmeContent) {
      reportContent += `### Latest Results\n\n`;
      reportContent += `**Directory:** \`${path.basename(latestDir)}\`\n\n`;
      reportContent += `- **Total:** ${stats.total}\n`;
      reportContent += `- **Passed:** ${stats.passed} ✅\n`;
      reportContent += `- **Failed:** ${stats.failed} ❌\n`;
      reportContent += `- **Skipped:** ${stats.skipped} ⏭️\n\n`;

      const testsSection = readmeContent.split("## All Tests")[1];
      if (testsSection) {
        reportContent += `### Test Results\n\n`;
        reportContent += testsSection.trim() + "\n\n";
      }
    }

    reportContent += `---\n\n`;
  }

  const summarySection = `# Summary\n\n`;
  const summaryContent =
    `- **Total Test Suites:** ${testSuites.length}\n` +
    `- **Suites with Results:** ${suitesWithResults}\n` +
    `- **Suites without Results:** ${suitesWithoutResults}\n\n` +
    `## Overall Test Statistics\n\n` +
    `- **Total Tests:** ${totalTests}\n` +
    `- **Passed:** ${totalPassed} ✅\n` +
    `- **Failed:** ${totalFailed} ❌\n` +
    `- **Skipped:** ${totalSkipped} ⏭️\n` +
    `- **Success Rate:** ${totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(2) : 0}%\n\n` +
    `---\n\n`;

  reportContent = summarySection + summaryContent + reportContent;

  const outputDir = path.join(process.cwd(), "docs", "test-reports");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, `${timestamp}.md`);
  fs.writeFileSync(outputPath, reportContent);

  console.log(`\n✅ Test report generated: ${outputPath}\n`);
  console.log(`Summary:`);
  console.log(`  Total Tests: ${totalTests}`);
  console.log(`  Passed: ${totalPassed} ✅`);
  console.log(`  Failed: ${totalFailed} ❌`);
  console.log(`  Skipped: ${totalSkipped} ⏭️`);
  console.log(`  Success Rate: ${totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(2) : 0}%\n`);
}

function main() {
  const args = process.argv.slice(2);
  const shouldCleanup = args.includes("--cleanup");

  generateConsolidatedReport();

  if (shouldCleanup) {
    console.log("🧹 Cleaning up old test results and reports...\n");
    const cleanupStats = cleanupOldTestResults();
    cleanupOldTestReports(cleanupStats);

    const sizeMB = (cleanupStats.totalSizeFreed / (1024 * 1024)).toFixed(2);

    console.log("✅ Cleanup complete:");
    console.log(`  Test directories deleted: ${cleanupStats.directoriesDeleted}`);
    console.log(`  JSON files deleted: ${cleanupStats.jsonFilesDeleted}`);
    console.log(`  Report files deleted: ${cleanupStats.reportFilesDeleted}`);
    console.log(`  Space freed: ${sizeMB} MB\n`);
  }
}

main();
