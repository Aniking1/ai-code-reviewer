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
  saveReview,
  type ReviewHistoryRecord,
} from "../history/review-history-service.js";

import {
  consolidateFindings,
} from "./review-consolidator.js";

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

  /*
   * Execute the actual review pipeline.
   *
   * This is the production path used by /review.
   */
  const rawReview =
    await reviewRunner(context);

  /*
   * Consolidate the findings returned by the Supervisor.
   *
   * This performs:
   * - validation
   * - duplicate/overlap removal
   * - severity/confidence prioritization
   * - deterministic recommendation
   */
  const consolidated =
    consolidateFindings(
      rawReview.findings,
    );

  /*
   * Preserve the review runner's original summary and activity.
   *
   * This is important because the summary may contain useful
   * contextual information produced by the Supervisor, while the
   * consolidated result is authoritative for findings and
   * recommendation.
   */
  const review: ReviewResult = {
    ...rawReview,
    findings:
      consolidated.findings,
    summary:
      rawReview.summary,
  };

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

  /*
   * Use the deterministic recommendation produced from the
   * consolidated findings rather than recalculating it from
   * the raw findings.
   */
  const recommendation =
    consolidated.recommendation;

  const history =
    await saveReview({
      reviewType: input.type,

      repositoryPath:
        context.repositoryPath,

      repositoryName:
        context.repositoryName,

      branch:
        context.branch,

      commit:
        context.commit,

      summary:
        review.summary,

      recommendation,

      findings:
        review.findings.map(
          (finding) => ({
            ...finding,
            specialist:
              finding.specialist ??
              "general-reviewer",
          }),
        ),

      activity:
        review.activity,
    });

  return {
    input,
    context,
    review,
    history,
  };
}