import { registerApiRoute } from "@mastra/core/server";

import { reviewInputSchema } from "../schemas/review-input.js";
import { runReview } from "../services/review/review-service.js";

function isProviderError(
  error: unknown,
): boolean {
  if (
    error &&
    typeof error === "object" &&
    "statusCode" in error
  ) {
    const statusCode =
      (error as { statusCode?: unknown })
        .statusCode;

    if (statusCode === 402 || statusCode === 429) {
      return true;
    }
  }

  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  return (
    message.includes("insufficient credits") ||
    message.includes("provider") ||
    message.includes("upstream llm") ||
    message.includes("api error")
  );
}

export const reviewApiRoute =
  registerApiRoute("/review", {
    method: "POST",

    handler: async (c) => {
      try {
        const body = await c.req.json();

        const parsed =
          reviewInputSchema.safeParse(body);

        if (!parsed.success) {
          return c.json(
            {
              error:
                "Invalid review request.",
              details:
                parsed.error.flatten(),
            },
            400,
          );
        }

        const result =
          await runReview(parsed.data);

        return c.json(
          {
            review: result.review,
            context: {
              type: result.context.type,
              repositoryPath:
                result.context
                  .repositoryPath,
              repositoryName:
                result.context
                  .repositoryName,
              branch:
                result.context.branch,
              commit:
                result.context.commit,
              changedFiles:
                result.context
                  .changedFiles,
              summary:
                result.context.summary,
            },
          },
          200,
        );
      } catch (error) {
        console.error(
          "Review request failed:",
          error,
        );

        if (isProviderError(error)) {
          return c.json(
            {
              error:
                "AI provider unavailable.",
              details:
                error instanceof Error
                  ? error.message
                  : "The configured AI provider could not process the request.",
              code:
                "AI_PROVIDER_UNAVAILABLE",
            },
            503,
          );
        }

        return c.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Review request failed.",
          },
          500,
        );
      }
    },
  });
