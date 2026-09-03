import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  createReviewPrompt,
  parseReviewResponse,
  runAgentReviewWithAgent,
} from "../review-orchestrator.js";

import type { ReviewContext } from "../review-context-service.js";

const baseContext: ReviewContext = {
  type: "diff",

  changedFiles: [
    {
      path: "hello.ts",
      status: "modified",
    },
  ],

  diff: [
    "-export function hello() { return 'hello'; }",
    "+export function hello(name: string) {",
    "+  return `Hello, ${name}!`;",
    "+}",
  ].join("\n"),

  files: [
    {
      path: "hello.ts",
      content: [
        "export function hello(name: string) {",
        "  return `Hello, ${name}!`;",
        "}",
      ].join("\n"),
    },
  ],

  summary: "Review the supplied Git diff.",
};

describe("review-orchestrator", () => {
  it("builds a review prompt containing the review evidence", () => {
    const prompt =
      createReviewPrompt(baseContext);

    assert.match(
      prompt,
      /expert software code reviewer/i,
    );

    assert.match(
      prompt,
      /hello\.ts/,
    );

    assert.match(
      prompt,
      /Hello, \$\{name\}!/,
    );

    assert.match(
      prompt,
      /CORRECTNESS/,
    );

    assert.match(
      prompt,
      /SECURITY/,
    );

    assert.match(
      prompt,
      /CRITICAL/,
    );
  });

  it("parses a valid model response", () => {
    const response = JSON.stringify({
      findings: [
        {
          id: "finding-001",
          title: "Missing input validation",
          category: "CORRECTNESS",
          severity: "MEDIUM",
          confidence: "HIGH",
          file: "hello.ts",
          lineStart: 1,
          lineEnd: 3,
          explanation:
            "The function accepts a string without validating its expected format.",
          impact:
            "Unexpected input may produce incorrect application behavior.",
          recommendation:
            "Validate the input before using it.",
          evidence:
            "The function directly interpolates the supplied name.",
          specialist: "general-reviewer",
        },
      ],
    });

    const findings =
      parseReviewResponse(response);

    assert.equal(
      findings.length,
      1,
    );

    assert.equal(
      findings[0]?.id,
      "finding-001",
    );

    assert.equal(
      findings[0]?.category,
      "CORRECTNESS",
    );

    assert.equal(
      findings[0]?.severity,
      "MEDIUM",
    );

    assert.equal(
      findings[0]?.confidence,
      "HIGH",
    );

    assert.equal(
      findings[0]?.specialist,
      "general-reviewer",
    );
  });

  it("parses an empty findings response", () => {
    const findings =
      parseReviewResponse(
        JSON.stringify({
          findings: [],
        }),
      );

    assert.deepEqual(
      findings,
      [],
    );
  });

  it("parses JSON wrapped in a markdown code block", () => {
    const response = `
\`\`\`json
{
  "findings": []
}
\`\`\`
`;

    const findings =
      parseReviewResponse(response);

    assert.deepEqual(
      findings,
      [],
    );
  });

  it("rejects malformed JSON", () => {
    assert.throws(
      () =>
        parseReviewResponse(
          "this is not JSON",
        ),
    );
  });

  it("rejects findings with invalid severity", () => {
    const response = JSON.stringify({
      findings: [
        {
          id: "finding-001",
          title: "Invalid severity",
          category: "SECURITY",
          severity: "SEVERE",
          confidence: "HIGH",
          explanation:
            "Invalid test finding.",
          impact:
            "Invalid test impact.",
          specialist: "general-reviewer",
        },
      ],
    });

    assert.throws(
      () => parseReviewResponse(response),
    );
  });

  it("rejects findings without required fields", () => {
    const response = JSON.stringify({
      findings: [
        {
          id: "finding-001",
          title: "Incomplete finding",
          category: "SECURITY",
        },
      ],
    });

    assert.throws(
      () => parseReviewResponse(response),
    );
  });

  it("runs an agent review with a credential-free fake agent", async () => {
    const fakeAgent = {
      async generate(prompt: string) {
        assert.match(
          prompt,
          /hello\.ts/,
        );

        return {
          text: JSON.stringify({
            findings: [
              {
                id: "finding-agent-001",
                title: "Agent-detected issue",
                category: "CORRECTNESS",
                severity: "MEDIUM",
                confidence: "HIGH",
                file: "hello.ts",
                lineStart: 1,
                lineEnd: 3,
                explanation:
                  "The fake agent detected a test issue.",
                impact:
                  "This verifies the agent orchestration path.",
                recommendation:
                  "Address the detected issue.",
                evidence:
                  "The test supplied hello.ts as review evidence.",
                specialist: "general-reviewer",
              },
            ],
          }),
        };
      },
    };

    const result =
      await runAgentReviewWithAgent(
        baseContext,
        fakeAgent,
      );

    assert.equal(
      result.findings.length,
      1,
    );

    assert.equal(
      result.findings[0]?.id,
      "finding-agent-001",
    );

    assert.equal(
      result.findings[0]?.specialist,
      "general-reviewer",
    );

    assert.match(
      result.summary,
      /Identified 1 review finding/,
    );
  });
});