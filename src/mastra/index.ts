import { Mastra } from "@mastra/core/mastra";

import { reviewAgent } from "./agents/review-agent.js";
import { correctnessAgent } from "./agents/specialists/correctness-agent.js";
import { securityAgent } from "./agents/specialists/security-agent.js";
import { architectureAgent } from "./agents/specialists/architecture-agent.js";
import { performanceAgent } from "./agents/specialists/performance-agent.js";
import { maintainabilityAgent } from "./agents/specialists/maintainability-agent.js";
import { testingAgent } from "./agents/specialists/testing-agent.js";

import { reviewApiRoute } from "./routes/review-route.js";
import {
  listReviewsApiRoute,
  getReviewApiRoute,
} from "./routes/history-routes.js";

export const mastra = new Mastra({
  agents: {
    reviewAgent,
    correctnessAgent,
    securityAgent,
    architectureAgent,
    performanceAgent,
    maintainabilityAgent,
    testingAgent,
  },

  server: {
    apiRoutes: [
      reviewApiRoute,
      listReviewsApiRoute,
      getReviewApiRoute,
    ],
  },
});
