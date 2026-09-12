import type { ReviewInput } from "../../schemas/review-input.js";

import {
  buildReviewContext,
  type ReviewContext,
} from "./review-context-service.js";

import {
  runAgentReview,
  type ReviewResult,
} from "./review-orchestrator.js";

import {
  determineRecommendation,
} from "./review-consolidator.js";

import {
  saveReview,
  type ReviewHistoryRecord,
} from "../history/review-history-service.js";

export interface ReviewServiceResult {
  input: ReviewInput;
  context: ReviewContext;
  review: ReviewResult;
  history: ReviewHistoryRecord | null;
}

export type ReviewRunner = (
  context: ReviewContext,
) => Promise<ReviewResult>;

export interface RunReviewOptions {
  reviewRunner?: ReviewRunner;
  saveToHistory?: boolean;
}

export async function runReview(
  input: ReviewInput,
  options: RunReviewOptions = {},
): Promise<ReviewServiceResult> {
  const context =
    await buildReviewContext(input);

  const reviewRunner =
    options.reviewRunner ?? runAgentReview;

  const review =
    await reviewRunner(context);

  const shouldSave =
    options.saveToHistory ?? true;

  if (!shouldSave) {
    return {
      input,
      context,
      review,
      history: null,
    };
  }

  const recommendation =
    determineRecommendation(
      review.findings,
    );

  const history =
    await saveReview({
      reviewType: input.type,
      repositoryPath:
        context.repositoryPath,
      repositoryName:
        context.repositoryName,
      branch: context.branch,
      commit: context.commit,
      summary: review.summary,
      recommendation,
      findings: review.findings.map(
        (finding) => ({
          ...finding,
          specialist:
            finding.specialist ??
            "general-reviewer",
        }),
      ),
      activity: review.activity,
    });

  return {
    input,
    context,
    review,
    history,
  };
}
