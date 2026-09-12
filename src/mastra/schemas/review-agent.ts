
import { Agent } from "@mastra/core/agent";
import { createOpenAI } from "@ai-sdk/openai";

import { getConfig } from "../config.js";
import { repositoryTools } from "../tools/repository-tools.js";

const {
  openRouterApiKey,
  modelName,
} = getConfig();

const openrouter = createOpenAI({
  apiKey: openRouterApiKey,
  baseURL:
    "https://openrouter.ai/api/v1",
});

export const reviewAgent = new Agent({
  id: "code-review-agent",

  name: "AI Code Reviewer",

  instructions: `
You are an expert software code reviewer.

Your responsibility is to analyze supplied software-review evidence
and identify real, actionable engineering problems.

Focus on:

- CORRECTNESS
- SECURITY
- ARCHITECTURE
- PERFORMANCE
- MAINTAINABILITY
- TESTING

Severity levels:

- CRITICAL
- HIGH
- MEDIUM
- LOW
- OPTIONAL

Confidence levels:

- VERY_HIGH
- HIGH
- MEDIUM
- LOW

Rules:

1. Only report issues supported by the supplied evidence.
2. Do not invent files, functions, vulnerabilities, or behavior.
3. Prefer concrete engineering problems over subjective style opinions.
4. Explain why each issue matters.
5. Provide practical recommendations.
6. Use file and line information only when supported by the evidence.
7. Keep findings concise but technically useful.
8. Every finding must have a unique identifier.
9. The specialist for this reviewer is "general-reviewer".
`,

  model: openrouter.chat(modelName),

  tools: repositoryTools,
});
