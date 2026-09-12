import {
  registerApiRoute,
} from "@mastra/core/server";

import {
  getReview,
  listReviews,
} from "../services/history/review-history-service.js";

export const listReviewsApiRoute =
  registerApiRoute("/reviews", {
    method: "GET",

    handler: async (c) => {
      try {
        const reviews =
          await listReviews();

        return c.json(
          {
            reviews,
          },
          200,
        );
      } catch (error) {
        console.error(
          "Failed to list reviews:",
          error,
        );

        return c.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Failed to list reviews.",
          },
          500,
        );
      }
    },
  });

export const getReviewApiRoute =
  registerApiRoute("/reviews/:reviewId", {
    method: "GET",

    handler: async (c) => {
      try {
        const reviewId =
          c.req.param("reviewId");

        if (!reviewId) {
          return c.json(
            {
              error:
                "reviewId is required.",
            },
            400,
          );
        }

        const review =
          await getReview(reviewId);

        if (!review) {
          return c.json(
            {
              error: "Review not found.",
            },
            404,
          );
        }

        return c.json(
          {
            review,
          },
          200,
        );
      } catch (error) {
        console.error(
          "Failed to retrieve review:",
          error,
        );

        return c.json(
          {
            error:
              error instanceof Error
                ? error.message
                : "Failed to retrieve review.",
          },
          500,
        );
      }
    },
  });
