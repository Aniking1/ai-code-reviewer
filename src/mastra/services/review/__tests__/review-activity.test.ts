import assert from "node:assert/strict";
import test from "node:test";

import {
  runAgentReviewWithAgent,
} from "../review-orchestrator.js";
import type { ReviewContext } from "../review-context-service.js";

const context: ReviewContext = {
  type: "repository",
  repositoryPath:
    "./workspace/repositories/sample-repo",
  repositoryName: "sample-repo",
  branch: "main",
  commit: "test-commit",
  changedFiles: [],
  diff: "",
  files: [],
  summary: "Test review context.",
};

test(
  "records actually selected specialist agents",
  async () => {
    const result =
      await runAgentReviewWithAgent(
        context,
        {
          async generate(
            _prompt: string,
            options?: {
              hooks?: {
                beforeToolCall?: (
                  event: {
                    toolName: string;
                  },
                ) => void;
              };
            },
          ) {
            options?.hooks?.beforeToolCall?.({
              toolName:
                "agent-securityAgent",
            });

            options?.hooks?.beforeToolCall?.({
              toolName:
                "agent-testingAgent",
            });

            return {
              text: JSON.stringify({
                findings: [],
              }),
            };
          },
        },
      );

    assert.equal(
      result.activity?.supervisor,
      "completed",
    );

    const security =
      result.activity?.specialists.find(
        (item) =>
          item.id === "security",
      );

    const testing =
      result.activity?.specialists.find(
        (item) =>
          item.id === "testing",
      );

    const correctness =
      result.activity?.specialists.find(
        (item) =>
          item.id === "correctness",
      );

    assert.equal(
      security?.status,
      "selected",
    );

    assert.equal(
      testing?.status,
      "selected",
    );

    assert.equal(
      correctness?.status,
      "not_selected",
    );
  },
);
