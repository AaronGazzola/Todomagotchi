import { describe, it, expect, vi, beforeEach, afterAll, afterEach } from "vitest";
import {
  createTodoAction,
  toggleTodoAction,
  deleteTodoAction,
} from "./page.actions";
import { auth } from "@/lib/auth";
import { getAuthenticatedClient } from "@/lib/auth.utils";
import * as fs from "fs";
import * as path from "path";

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      hasPermission: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth.utils", () => ({
  getAuthenticatedClient: vi.fn(),
}));

vi.mock("./(components)/Tamagotchi.actions", () => ({
  feedTamagotchiHelper: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

const generateTestRunId = (): string => {
  const now = new Date();
  const timestamp = now
    .toISOString()
    .replace(/T/, "_")
    .replace(/:/g, "-")
    .replace(/\..+/, "")
    .split("Z")[0];
  const milliseconds = now.getMilliseconds().toString().padStart(3, "0");
  return `${timestamp}-${milliseconds}_unit`;
};

const TEST_RUN_ID = generateTestRunId();
const suiteStartTime = Date.now();

const generateReadme = (testReport: any): string => {
  const { summary, tests } = testReport;
  const timestamp = new Date(summary.timestamp).toLocaleString();
  const durationMs = summary.duration;

  let readme = `# Unit Test Report - Todo Actions Permission Tests\n\n`;
  readme += `**Timestamp:** ${timestamp}\n`;
  readme += `**Duration:** ${durationMs}ms\n\n`;

  readme += `## Summary\n\n`;
  readme += `- ✅ **Passed:** ${summary.passed}/${summary.total}\n`;
  readme += `- ❌ **Failed:** ${summary.failed}/${summary.total}\n`;
  readme += `- ⏭️ **Skipped:** ${summary.skipped}/${summary.total}\n\n`;

  if (summary.failed > 0) {
    readme += `## Failed Tests\n\n`;
    tests
      .filter((t: any) => t.status === "failed")
      .forEach((test: any) => {
        readme += `### ❌ ${test.title}\n\n`;
        readme += `- **File:** ${test.file}\n`;
        readme += `- **Duration:** ${test.duration}ms\n`;
        readme += `- **Status:** ${test.status}\n\n`;
        if (test.error) {
          readme += `**Error:**\n\`\`\`\n${test.error}\n\`\`\`\n\n`;
        }
      });
  }

  readme += `## All Tests\n\n`;
  tests.forEach((test: any) => {
    const icon = test.status === "passed" ? "✅" : "❌";
    readme += `${icon} ${test.title} (${test.duration}ms)\n`;
  });

  return readme;
};

describe("Todo Actions - Permission Tests", () => {
  const testResults: {
    title: string;
    file: string;
    status: "passed" | "failed";
    duration: number;
    error: string | null;
    startTime: number;
  }[] = [];

  const mockDb = {
    todo: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  };

  const mockSession = {
    user: { id: "user-123" },
    session: { activeOrganizationId: "org-123" },
  };

  beforeEach((context) => {
    vi.clearAllMocks();
    vi.mocked(getAuthenticatedClient).mockResolvedValue({
      db: mockDb as any,
      session: mockSession as any,
    });

    (context as any).testStartTime = Date.now();
  });

  afterEach((context) => {
    const task = context.task;
    const startTime = (context as any).testStartTime || Date.now();
    const duration = Date.now() - startTime;

    testResults.push({
      title: task.name,
      file: "app/page.actions.test.ts",
      status: task.result?.state === "pass" ? "passed" : "failed",
      duration,
      error: task.result?.errors?.[0]?.message || null,
      startTime,
    });
  });

  afterAll(() => {
    const suiteDuration = Date.now() - suiteStartTime;
    const outputDir = path.join(process.cwd(), "test-results", TEST_RUN_ID);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const passed = testResults.filter((t) => t.status === "passed").length;
    const failed = testResults.filter((t) => t.status === "failed").length;
    const total = testResults.length;

    const testReport = {
      summary: {
        total,
        passed,
        failed,
        skipped: 0,
        duration: suiteDuration,
        timestamp: new Date().toISOString(),
        outputDirectory: outputDir,
      },
      tests: testResults,
    };

    fs.writeFileSync(
      path.join(outputDir, "test-report.json"),
      JSON.stringify(testReport, null, 2)
    );

    const readme = generateReadme(testReport);
    fs.writeFileSync(path.join(outputDir, "README.md"), readme);

    console.log("\n📊 Unit Test Summary:");
    console.log(`Total: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📁 Test Results: test-results/${TEST_RUN_ID}/`);
  });

  describe("createTodoAction", () => {
    it("should allow admin to create todo", async () => {
      vi.mocked(auth.api.hasPermission).mockResolvedValue(true);
      mockDb.todo.create.mockResolvedValue({
        id: "todo-1",
        text: "Test todo",
        completed: false,
        organizationId: "org-123",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await createTodoAction("Test todo");

      expect(auth.api.hasPermission).toHaveBeenCalledWith({
        headers: expect.anything(),
        body: {
          permissions: {
            todo: ["create"],
          },
        },
      });
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("should allow owner to create todo", async () => {
      vi.mocked(auth.api.hasPermission).mockResolvedValue(true);
      mockDb.todo.create.mockResolvedValue({
        id: "todo-1",
        text: "Test todo",
        completed: false,
        organizationId: "org-123",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await createTodoAction("Test todo");

      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("should deny member from creating todo", async () => {
      vi.mocked(auth.api.hasPermission).mockResolvedValue(false);

      const result = await createTodoAction("Test todo");

      expect(result.error).toBe("Insufficient permissions to create todos");
      expect(result.data).toBeUndefined();
      expect(mockDb.todo.create).not.toHaveBeenCalled();
    });

    it("should handle no active organization", async () => {
      vi.mocked(auth.api.hasPermission).mockResolvedValue(true);
      vi.mocked(getAuthenticatedClient).mockResolvedValue({
        db: mockDb as any,
        session: {
          user: { id: "user-123" },
          session: { activeOrganizationId: null },
        } as any,
      });

      const result = await createTodoAction("Test todo");

      expect(result.error).toBe("No active organization");
      expect(mockDb.todo.create).not.toHaveBeenCalled();
    });
  });

  describe("toggleTodoAction", () => {
    const mockTodo = {
      id: "todo-1",
      text: "Test todo",
      completed: false,
      organizationId: "org-123",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should allow member to toggle todo", async () => {
      vi.mocked(auth.api.hasPermission).mockResolvedValue(true);
      mockDb.todo.findUnique.mockResolvedValue(mockTodo);
      mockDb.todo.update.mockResolvedValue({ ...mockTodo, completed: true });

      const result = await toggleTodoAction("todo-1");

      expect(auth.api.hasPermission).toHaveBeenCalledWith({
        headers: expect.anything(),
        body: {
          permissions: {
            todo: ["update"],
          },
        },
      });
      expect(result.data).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it("should allow admin to toggle todo", async () => {
      vi.mocked(auth.api.hasPermission).mockResolvedValue(true);
      mockDb.todo.findUnique.mockResolvedValue(mockTodo);
      mockDb.todo.update.mockResolvedValue({ ...mockTodo, completed: true });

      const result = await toggleTodoAction("todo-1");

      expect(result.data?.completed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should deny user without update permission", async () => {
      vi.mocked(auth.api.hasPermission).mockResolvedValue(false);

      const result = await toggleTodoAction("todo-1");

      expect(result.error).toBe("Insufficient permissions to update todos");
      expect(mockDb.todo.findUnique).not.toHaveBeenCalled();
    });

    it("should handle todo not found", async () => {
      vi.mocked(auth.api.hasPermission).mockResolvedValue(true);
      mockDb.todo.findUnique.mockResolvedValue(null);

      const result = await toggleTodoAction("todo-1");

      expect(result.error).toBe("Todo not found");
      expect(mockDb.todo.update).not.toHaveBeenCalled();
    });

    it("should handle todo from different organization", async () => {
      vi.mocked(auth.api.hasPermission).mockResolvedValue(true);
      mockDb.todo.findUnique.mockResolvedValue({
        ...mockTodo,
        organizationId: "different-org",
      });

      const result = await toggleTodoAction("todo-1");

      expect(result.error).toBe("Todo does not belong to active organization");
      expect(mockDb.todo.update).not.toHaveBeenCalled();
    });

    it("should handle no active organization", async () => {
      vi.mocked(auth.api.hasPermission).mockResolvedValue(true);
      vi.mocked(getAuthenticatedClient).mockResolvedValue({
        db: mockDb as any,
        session: {
          user: { id: "user-123" },
          session: { activeOrganizationId: null },
        } as any,
      });

      const result = await toggleTodoAction("todo-1");

      expect(result.error).toBe("No active organization");
      expect(mockDb.todo.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("deleteTodoAction", () => {
    const mockTodo = {
      id: "todo-1",
      text: "Test todo",
      completed: false,
      organizationId: "org-123",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("should allow admin to delete todo", async () => {
      vi.mocked(auth.api.hasPermission).mockResolvedValue(true);
      mockDb.todo.findUnique.mockResolvedValue(mockTodo);
      mockDb.todo.delete.mockResolvedValue(mockTodo);

      const result = await deleteTodoAction("todo-1");

      expect(auth.api.hasPermission).toHaveBeenCalledWith({
        headers: expect.anything(),
        body: {
          permissions: {
            todo: ["delete"],
          },
        },
      });
      expect(result.error).toBeUndefined();
      expect(mockDb.todo.delete).toHaveBeenCalledWith({ where: { id: "todo-1" } });
    });

    it("should allow owner to delete todo", async () => {
      vi.mocked(auth.api.hasPermission).mockResolvedValue(true);
      mockDb.todo.findUnique.mockResolvedValue(mockTodo);
      mockDb.todo.delete.mockResolvedValue(mockTodo);

      const result = await deleteTodoAction("todo-1");

      expect(result.error).toBeUndefined();
    });

    it("should deny member from deleting todo", async () => {
      vi.mocked(auth.api.hasPermission).mockResolvedValue(false);

      const result = await deleteTodoAction("todo-1");

      expect(result.error).toBe("Insufficient permissions to delete todos");
      expect(mockDb.todo.findUnique).not.toHaveBeenCalled();
      expect(mockDb.todo.delete).not.toHaveBeenCalled();
    });

    it("should handle todo not found", async () => {
      vi.mocked(auth.api.hasPermission).mockResolvedValue(true);
      mockDb.todo.findUnique.mockResolvedValue(null);

      const result = await deleteTodoAction("todo-1");

      expect(result.error).toBe("Todo not found");
      expect(mockDb.todo.delete).not.toHaveBeenCalled();
    });

    it("should handle todo from different organization", async () => {
      vi.mocked(auth.api.hasPermission).mockResolvedValue(true);
      mockDb.todo.findUnique.mockResolvedValue({
        ...mockTodo,
        organizationId: "different-org",
      });

      const result = await deleteTodoAction("todo-1");

      expect(result.error).toBe("Todo does not belong to active organization");
      expect(mockDb.todo.delete).not.toHaveBeenCalled();
    });

    it("should handle no active organization", async () => {
      vi.mocked(auth.api.hasPermission).mockResolvedValue(true);
      vi.mocked(getAuthenticatedClient).mockResolvedValue({
        db: mockDb as any,
        session: {
          user: { id: "user-123" },
          session: { activeOrganizationId: null },
        } as any,
      });

      const result = await deleteTodoAction("todo-1");

      expect(result.error).toBe("No active organization");
      expect(mockDb.todo.findUnique).not.toHaveBeenCalled();
    });
  });
});
