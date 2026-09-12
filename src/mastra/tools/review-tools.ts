import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import {
  consolidateFindings,
  reviewFindingSchema,
} from "../services/review/review-consolidator.js";

export const consolidateReviewFindingsTool = createTool({
  id: "consolidate-review-findings",

  description:
    "Validate, deduplicate, prioritize, and determine the overall recommendation for specialist code-review findings.",

  inputSchema: z.object({
    findings: z.array(reviewFindingSchema),
  }),

  outputSchema: z.object({
    recommendation: z.enum([
      "APPROVE",
      "APPROVE WITH COMMENTS",
      "REQUEST CHANGES",
      "BLOCK MERGE",
    ]),
    summary: z.string(),
    findings: z.array(reviewFindingSchema),
  }),

  execute: async (inputData) => {
    return consolidateFindings(inputData.findings);
  },
});
