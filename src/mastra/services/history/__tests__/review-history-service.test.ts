import assert from "node:assert/strict";
import test from "node:test";

import {
  deleteReview,
  getReview,
  listReviews,
  saveReview,
} from "../review-history-service.js";

const activity = {
  supervisor: "completed" as const,
  specialists: [
    {
      id: "security" as const,
      label: "Security",
      description:
        "Security vulnerabilities",
      status: "selected" as const,
    },
    {
      id: "correctness" as const,
      label: "Correctness",
      description:
        "Logic and behavior",
      status: "not_selected" as const,
    },
  ],
};

test("saves and retrieves a review", async () => {
  const saved = await saveReview({
    reviewType: "repository",
    repositoryPath:
      "./workspace/repositories/sample-repo",
    repositoryName: "sample-repo",
    branch: "main",
    commit: "test-commit",
    summary: "Test review.",
    recommendation: "APPROVE",
    findings: [],
    activity,
  });

  assert.ok(saved.reviewId);

  const loaded =
    await getReview(saved.reviewId);

  assert.ok(loaded);
  assert.equal(
    loaded?.repositoryName,
    "sample-repo",
  );

  assert.deepEqual(
    loaded?.activity,
    activity,
  );

  await deleteReview(saved.reviewId);
});

test("lists reviews newest first", async () => {
  const first = await saveReview({
    reviewType: "repository",
    repositoryName: "first",
    summary: "First review.",
    recommendation: "APPROVE",
    findings: [],
  });

  const second = await saveReview({
    reviewType: "repository",
    repositoryName: "second",
    summary: "Second review.",
    recommendation: "APPROVE",
    findings: [],
  });

  const reviews =
    await listReviews();

  const firstIndex =
    reviews.findIndex(
      (review) =>
        review.reviewId ===
        first.reviewId,
    );

  const secondIndex =
    reviews.findIndex(
      (review) =>
        review.reviewId ===
        second.reviewId,
    );

  assert.ok(
    secondIndex < firstIndex,
  );

  await deleteReview(first.reviewId);
  await deleteReview(second.reviewId);
});

test("returns null for an unknown review", async () => {
  const review =
    await getReview(
      "does-not-exist",
    );

  assert.equal(review, null);
});

test("deletes a saved review", async () => {
  const saved = await saveReview({
    reviewType: "repository",
    summary: "Delete test.",
    recommendation: "APPROVE",
    findings: [],
  });

  const deleted =
    await deleteReview(saved.reviewId);

  assert.equal(deleted, true);

  const loaded =
    await getReview(saved.reviewId);

  assert.equal(loaded, null);
});
