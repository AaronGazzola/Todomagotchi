export class TestStepLogger {
  private stepNumber: number = 0;
  private testName: string;

  constructor(testName: string) {
    this.testName = testName;
    process.stderr.write(`\n🧪 ${testName}\n`);
    console.log(`\n🧪 ${testName}`);
  }

  async step<T>(description: string, fn: () => Promise<T>): Promise<T> {
    this.stepNumber++;
    const stepNum = this.stepNumber.toString().padStart(2, "0");

    try {
      process.stderr.write(`   ${stepNum}. ${description}...`);
      const result = await fn();
      process.stderr.write(` ✓\n`);
      console.log(`   ${stepNum}. ${description}... ✓`);
      return result;
    } catch (error) {
      process.stderr.write(` ✗\n`);
      console.log(`   ${stepNum}. ${description}... ✗`);
      throw error;
    }
  }

  logStep(description: string, passed: boolean): void {
    this.stepNumber++;
    const stepNum = this.stepNumber.toString().padStart(2, "0");
    const icon = passed ? "✓" : "✗";
    process.stderr.write(`   ${stepNum}. ${description} ${icon}\n`);
    console.log(`   ${stepNum}. ${description} ${icon}`);
  }
}
