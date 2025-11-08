import { test as base, expect } from "@playwright/test";

export interface DiagnosticData {
  consoleLogs: Array<{
    type: string;
    text: string;
    timestamp: number;
    location?: string;
  }>;
  pageErrors: Array<{
    message: string;
    stack?: string;
    timestamp: number;
  }>;
  networkFailures: Array<{
    url: string;
    method: string;
    status: number;
    statusText: string;
    responseBody?: string;
    timestamp: number;
  }>;
  testContext?: {
    user?: string;
    conditions?: string;
    expectation?: string;
    observed?: string;
  };
}

export const test = base.extend<{
  diagnostics: DiagnosticData;
}>({
  diagnostics: async ({ page }, use, testInfo) => {
    const diagnostics: DiagnosticData = {
      consoleLogs: [],
      pageErrors: [],
      networkFailures: [],
    };

    page.on("console", (msg) => {
      diagnostics.consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now(),
        location: msg.location()
          ? `${msg.location().url}:${msg.location().lineNumber}`
          : undefined,
      });
    });

    page.on("pageerror", (error) => {
      diagnostics.pageErrors.push({
        message: error.message,
        stack: error.stack,
        timestamp: Date.now(),
      });
    });

    page.on("response", async (response) => {
      if (!response.ok() && response.status() >= 400) {
        let responseBody: string | undefined;
        try {
          const contentType = response.headers()["content-type"] || "";
          if (contentType.includes("application/json")) {
            responseBody = JSON.stringify(await response.json(), null, 2);
          } else if (contentType.includes("text/")) {
            responseBody = await response.text();
          }
        } catch (e) {
          responseBody = undefined;
        }

        diagnostics.networkFailures.push({
          url: response.url(),
          method: response.request().method(),
          status: response.status(),
          statusText: response.statusText(),
          responseBody,
          timestamp: Date.now(),
        });
      }
    });

    await use(diagnostics);

    if (testInfo.status !== "passed") {
      await testInfo.attach("diagnostic-data", {
        body: JSON.stringify(diagnostics, null, 2),
        contentType: "application/json",
      });
    }
  },
});

export { expect };
