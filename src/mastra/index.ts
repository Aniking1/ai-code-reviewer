import { Mastra } from "@mastra/core/mastra";

import { reviewAgent } from "./agents/review-agent.js";

export const mastra = new Mastra({
  agents: {
    reviewAgent,
  },
});