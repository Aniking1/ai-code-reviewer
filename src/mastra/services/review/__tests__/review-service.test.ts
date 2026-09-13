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

test(
  "runReview consolidates duplicate findings from the review runner",
  async () => {
    const result = await runReview(
      {
        type: "diff",
        diff:
          "diff --git a/hello.ts b/hello.ts",
      },
      {
        saveToHistory: false,
        reviewRunner: async () => {
          return {
            summary:
              "Duplicate findings should be consolidated.",
            findings: [
              {
                id: "SEC-001",
                title:
                  "Command injection through user input",
                category: "SECURITY",
                severity: "HIGH",
                confidence: "HIGH",
                file: "hello.ts",
                lineStart: 10,
                lineEnd: 10,
                explanation:
                  "User-controlled input reaches shell execution.",
                impact:
                  "An attacker could execute arbitrary commands.",
                recommendation:
                  "Avoid shell execution of untrusted input.",
                evidence:
                  "The user input is passed directly to command execution.",
                specialist: "security",
              },
              {
                id: "SEC-002",
                title:
                  "Command injection through user input",
                category: "SECURITY",
                severity: "HIGH",
                confidence: "MEDIUM",
                file: "hello.ts",
                lineStart: 10,
                lineEnd: 10,
                explanation:
                  "Untrusted user input reaches shell execution.",
                impact:
                  "This may allow arbitrary command execution.",
                recommendation:
                  "Validate input and avoid shell command interpolation.",
                evidence:
                  "The same user-controlled value reaches command execution.",
                specialist: "correctness-logic",
              },
            ],
          };
        },
      },
    );

    assert.equal(
      result.review.findings.length,
      1,
    );

    assert.equal(
      result.review.findings[0]?.id,
      "SEC-001",
    );

    assert.equal(
      result.review.findings[0]?.confidence,
      "HIGH",
    );

    assert.equal(
      result.review.findings[0]?.severity,
      "HIGH",
    );
  },
);
