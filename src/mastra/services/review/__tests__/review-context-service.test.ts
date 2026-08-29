
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildReviewContext,
} from "../review-context-service.js";

const repositoryPath =
  "./workspace/repositories/sample-repo";

describe("review-context-service", () => {
  it("builds context from a diff", async () => {
    const diff = [
      "diff --git a/hello.ts b/hello.ts",
      "-export function hello() { return 'hello'; }",
      "+export function hello(name: string) {",
      "+  return `Hello, ${name}!`;",
      "+}",
    ].join("\n");

    const context =
      await buildReviewContext({
        type: "diff",
        diff,
      });

    assert.equal(
      context.type,
      "diff",
    );

    assert.equal(
      context.diff,
      diff,
    );

    assert.deepEqual(
      context.changedFiles,
      [],
    );

    assert.deepEqual(
      context.files,
      [],
    );
  });

  it("builds context from a commit", async () => {
    const context =
      await buildReviewContext({
        type: "commit",
        repositoryPath,
        commit: "HEAD",
      });

    assert.equal(
      context.type,
      "commit",
    );

    assert.equal(
      context.repositoryName,
      "sample-repo",
    );

    assert.equal(
      context.branch,
      "main",
    );

    assert.match(
      context.commit ?? "",
      /^[0-9a-f]{40}$/,
    );

    assert.ok(
      context.commitInfo,
    );

    assert.equal(
      context.commitInfo?.subject,
      "feat: personalize greeting",
    );

    assert.deepEqual(
      context.changedFiles,
      [
        {
          path: "hello.ts",
          status: "modified",
        },
      ],
    );

    assert.match(
      context.diff,
      /\+export function hello\(name: string\)/,
    );

    assert.deepEqual(
      context.files.map(
        (file) => file.path,
      ),
      ["hello.ts"],
    );

    assert.match(
      context.files[0]?.content ?? "",
      /export function hello/,
    );
  });

  it("builds context from a repository", async () => {
    const context =
      await buildReviewContext({
        type: "repository",
        repositoryPath,
      });

    assert.equal(
      context.type,
      "repository",
    );

    assert.equal(
      context.repositoryName,
      "sample-repo",
    );

    assert.equal(
      context.branch,
      "main",
    );

    assert.match(
      context.commit ?? "",
      /^[0-9a-f]{40}$/,
    );

    assert.deepEqual(
      context.changedFiles,
      [],
    );

    assert.equal(
      context.diff,
      "",
    );

    assert.deepEqual(
      context.files.map(
        (file) => file.path,
      ),
      ["hello.ts"],
    );

    assert.match(
      context.files[0]?.content ?? "",
      /export function hello/,
    );
  });

  it("rejects unsupported pull request reviews", async () => {
    await assert.rejects(
      () =>
        buildReviewContext({
          type: "pull_request",
          repository: "example/repository",
          pullRequest: 1,
        }),
      /Pull request review is not yet supported/,
    );
  });
});

