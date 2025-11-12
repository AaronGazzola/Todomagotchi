import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const timestamp = new Date()
    .toISOString()
    .replace(/T/, '_')
    .replace(/:/g, '-')
    .replace(/\..+/, '')
    .split('Z')[0];

  const milliseconds = new Date().getMilliseconds().toString().padStart(3, '0');

  const testFileName = config.projects[0]?.testDir
    ? 'test'
    : 'unknown';

  const testRunId = `${timestamp}-${milliseconds}_${testFileName}`;

  process.env.TEST_RUN_ID = testRunId;

  return;
}

export default globalSetup;
