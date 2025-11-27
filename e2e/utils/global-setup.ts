import { FullConfig } from '@playwright/test';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  const timestamp = new Date()
    .toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '-')
    .replace(/\..+/, '')
    .split('Z')[0];

  const milliseconds = new Date().getMilliseconds().toString().padStart(3, '0');

  let testFileName = 'test';

  const grep = config.grep;
  if (grep && grep instanceof RegExp) {
    const match = grep.source;
    if (match && match !== '.*') {
      testFileName = match.replace(/[^a-zA-Z0-9-]/g, '');
    }
  }

  if (testFileName === 'test' && process.argv.length > 2) {
    const testArg = process.argv.find(arg => arg.includes('.spec.ts') || arg.includes('.test.ts'));
    if (testArg) {
      testFileName = path.basename(testArg, path.extname(testArg));
    }
  }

  const testRunId = `${timestamp}-${milliseconds}_${testFileName}`;
  process.env.TEST_RUN_ID = testRunId;
}

export default globalSetup;
