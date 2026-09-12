import assert from "node:assert/strict";
import test from "node:test";

import { reviewInputSchema } from "../../../schemas/review-input.js";

test("accepts repository review input", () => {
  const result = reviewInputSchema.safeParse({
    type: "repository",
    repositoryPath:
      "./workspace/repositories/sample-repo",
  });

  assert.equal(result.success, true);
});

test("accepts commit review input", () => {
  const result = reviewInputSchema.safeParse({
    type: "commit",
    repositoryPath:
      "./workspace/repositories/sample-repo",
    commit: "HEAD",
  });

  assert.equal(result.success, true);
});

test("accepts diff review input", () => {
  const result = reviewInputSchema.safeParse({
    type: "diff",
    diff: "diff --git a/hello.ts b/hello.ts",
  });

  assert.equal(result.success, true);
});

test("rejects invalid review input", () => {
  const result = reviewInputSchema.safeParse({
    type: "repository",
  });

  assert.equal(result.success, false);
});

