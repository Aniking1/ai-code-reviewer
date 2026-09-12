import assert from "node:assert/strict";
import test from "node:test";

import {
  runReview,
} from "../review-service.js";

test(
  "runReview builds repository context and uses the supplied review runner",
  async () => {
    const result = await runReview(
      {
        type: "repository",
        repositoryPath:
          "./workspace/repositories/sample-repo",
      },
      {
        saveToHistory: false,
        reviewRunner: async (context) => {
          return {
            findings: [],
            summary:
              `Fake review for ${context.repositoryName}`,
          };
        },
      },
    );

    assert.equal(
      result.input.type,
      "repository",
    );

    assert.equal(
      result.context.type,
      "repository",
    );

    assert.equal(
      result.context.repositoryName,
      "sample-repo",
    );

    assert.deepEqual(
      result.review.findings,
      [],
    );

    assert.equal(
      result.review.summary,
      "Fake review for sample-repo",
    );

    assert.equal(
      result.history,
      null,
    );
  },
);

test(
  "runReview passes commit input to the context builder",
  async () => {
    const result = await runReview(
      {
        type: "commit",
        repositoryPath:
          "./workspace/repositories/sample-repo",
        commit: "HEAD",
      },
      {
        saveToHistory: false,
        reviewRunner: async (context) => {
          return {
            findings: [],
            summary:
              `Review type: ${context.type}`,
          };
        },
      },
    );

    assert.equal(
      result.context.type,
      "commit",
    );

    assert.equal(
      result.review.summary,
      "Review type: commit",
    );
  },
);

test(
  "runReview passes diff input to the context builder",
  async () => {
    const result = await runReview(
      {
        type: "diff",
        diff:
          "diff --git a/hello.ts b/hello.ts",
      },
      {
        saveToHistory: false,
        reviewRunner: async (context) => {
          return {
            findings: [],
            summary:
              `Review type: ${context.type}`,
          };
        },
      },
    );

    assert.equal(
      result.context.type,
      "diff",
    );

    assert.equal(
      result.review.summary,
      "Review type: diff",
    );
  },
);
