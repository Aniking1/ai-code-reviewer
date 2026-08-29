
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getChangedFilesTool,
  getCommitTool,
  getDiffTool,
  getRepositoryInfoTool,
  listRepositoryFilesTool,
  readRepositoryFileTool,
} from "../repository-tools.js";

const repositoryPath =
  "./workspace/repositories/sample-repo";

async function executeTool<TInput, TOutput>(
  tool: {
    execute?: (
      inputData: TInput,
      context: never,
    ) => Promise<TOutput | void | unknown>;
  },
  input: TInput,
): Promise<TOutput> {
  assert.ok(
    tool.execute,
    "Expected Mastra tool to have an execute function.",
  );

  const result = await tool.execute(
    input,
    {} as never,
  );

  assert.ok(
    result !== undefined &&
      result !== null &&
      typeof result === "object" &&
      !("error" in result),
    "Expected tool execution to return a valid result.",
  );

  return result as TOutput;
}

describe("repository-tools", () => {
  it("gets repository information", async () => {
    const result = await executeTool<
      { repositoryPath: string },
      {
        path: string;
        name: string;
        branch?: string;
        commit: string;
        isGitRepository: boolean;
      }
    >(getRepositoryInfoTool, {
      repositoryPath,
    });

    assert.equal(result.name, "sample-repo");
    assert.equal(result.branch, "main");
    assert.equal(result.isGitRepository, true);

    assert.match(
      result.commit,
      /^[0-9a-f]{40}$/,
    );
  });

  it("lists repository files", async () => {
    const result = await executeTool<
      { repositoryPath: string },
      { files: string[] }
    >(listRepositoryFilesTool, {
      repositoryPath,
    });

    assert.deepEqual(
      result.files,
      ["hello.ts"],
    );
  });

  it("reads a repository file", async () => {
    const result = await executeTool<
      {
        repositoryPath: string;
        filePath: string;
      },
      {
        filePath: string;
        content: string;
      }
    >(readRepositoryFileTool, {
      repositoryPath,
      filePath: "hello.ts",
    });

    assert.equal(
      result.filePath,
      "hello.ts",
    );

    assert.match(
      result.content,
      /export function hello/,
    );
  });

  it("gets changed files between commits", async () => {
    const result = await executeTool<
      {
        repositoryPath: string;
        baseRef: string;
        targetRef: string;
      },
      {
        files: Array<{
          path: string;
          status:
            | "added"
            | "modified"
            | "deleted"
            | "renamed"
            | "copied"
            | "unknown";
          previousPath?: string;
        }>;
      }
    >(getChangedFilesTool, {
      repositoryPath,
      baseRef: "HEAD~1",
      targetRef: "HEAD",
    });

    assert.deepEqual(
      result.files,
      [
        {
          path: "hello.ts",
          status: "modified",
        },
      ],
    );
  });

  it("gets the repository diff", async () => {
    const result = await executeTool<
      {
        repositoryPath: string;
        baseRef: string;
        targetRef: string;
      },
      { diff: string }
    >(getDiffTool, {
      repositoryPath,
      baseRef: "HEAD~1",
      targetRef: "HEAD",
    });

    assert.match(
      result.diff,
      /-export function hello\(\) \{ return 'hello'; \}/,
    );

    assert.match(
      result.diff,
      /\+export function hello\(name: string\)/,
    );

    assert.match(
      result.diff,
      /\+  return `Hello, \$\{name\}!`;/,
    );
  });

  it("gets complete commit review context", async () => {
    const result = await executeTool<
      {
        repositoryPath: string;
        commitRef: string;
      },
      {
        hash: string;
        subject: string;
        author: string;
        date: string;
        changedFiles: Array<{
          path: string;
          status:
            | "added"
            | "modified"
            | "deleted"
            | "renamed"
            | "copied"
            | "unknown";
          previousPath?: string;
        }>;
        diff: string;
      }
    >(getCommitTool, {
      repositoryPath,
      commitRef: "HEAD",
    });

    assert.match(
      result.hash,
      /^[0-9a-f]{40}$/,
    );

    assert.equal(
      result.subject,
      "feat: personalize greeting",
    );

    assert.ok(
      result.author.length > 0,
    );

    assert.match(
      result.date,
      /^\d{4}-\d{2}-\d{2}T/,
    );

    assert.deepEqual(
      result.changedFiles,
      [
        {
          path: "hello.ts",
          status: "modified",
        },
      ],
    );

    assert.match(
      result.diff,
      /\+export function hello\(name: string\)/,
    );
  });
});

