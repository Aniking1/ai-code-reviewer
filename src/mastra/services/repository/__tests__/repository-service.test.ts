
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getChangedFiles,
  getCommit,
  getDiff,
  getRepositoryInfo,
  listFiles,
  readFile,
  validateRepositoryPath,
} from "../repository-service.js";

describe("repository-service", () => {
  it("returns metadata for a valid Git repository", async () => {
    const info = await getRepositoryInfo(
      "./workspace/repositories/sample-repo",
    );

    assert.equal(info.name, "sample-repo");
    assert.equal(info.isGitRepository, true);
    assert.equal(info.branch, "main");
    assert.match(
      info.commit ?? "",
      /^[0-9a-f]{40}$/,
    );
  });

  it("rejects a repository outside the workspace", async () => {
    await assert.rejects(
      () => validateRepositoryPath("."),
      /Repository path must be inside the workspace/,
    );
  });

  it("lists files in the repository", async () => {
    const files = await listFiles(
      "./workspace/repositories/sample-repo",
    );

    assert.deepEqual(files, ["hello.ts"]);
  });

  it("reads a file inside the repository", async () => {
    const content = await readFile(
      "./workspace/repositories/sample-repo",
      "hello.ts",
    );

    assert.match(
      content,
      /export function hello/,
    );
  });

  it("rejects file paths outside the repository", async () => {
    await assert.rejects(
      () =>
        readFile(
          "./workspace/repositories/sample-repo",
          "../../hello.ts",
        ),
      /File path must remain inside the repository/,
    );
  });

  it("identifies changed files between two commits", async () => {
    const files = await getChangedFiles(
      "./workspace/repositories/sample-repo",
      "HEAD~1",
      "HEAD",
    );

    assert.deepEqual(files, [
      {
        path: "hello.ts",
        status: "modified",
      },
    ]);
  });

  it("returns the diff between two commits", async () => {
    const diff = await getDiff(
      "./workspace/repositories/sample-repo",
      "HEAD~1",
      "HEAD",
    );

    assert.match(
      diff,
      /-export function hello\(\) \{ return 'hello'; \}/,
    );

    assert.match(
      diff,
      /\+export function hello\(name: string\)/,
    );

    assert.match(
      diff,
      /\+  return `Hello, \$\{name\}!`;/,
    );
  });

  it("returns metadata and changes for a commit", async () => {
    const commit = await getCommit(
      "./workspace/repositories/sample-repo",
      "HEAD",
    );

    assert.match(
      commit.hash,
      /^[0-9a-f]{40}$/,
    );

    assert.equal(
      commit.subject,
      "feat: personalize greeting",
    );

    assert.ok(commit.author.length > 0);

    assert.match(
      commit.date,
      /^\d{4}-\d{2}-\d{2}T/,
    );

    assert.deepEqual(
      commit.changedFiles,
      [
        {
          path: "hello.ts",
          status: "modified",
        },
      ],
    );

    assert.match(
      commit.diff,
      /\+export function hello\(name: string\)/,
    );
  });
});

