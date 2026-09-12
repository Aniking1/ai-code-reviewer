import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { z } from "zod";

import { reviewAgent } from "../../agents/review-agent.js";
import { getConfig } from "../../config.js";
import {
  findingSchema,
  type Finding,
} from "../../schemas/finding.js";
import type { ReviewContext } from "./review-context-service.js";

const findingsResponseSchema = z.object({
  findings: z.array(findingSchema),
});

export type SpecialistId =
  | "correctness"
  | "security"
  | "architecture"
  | "performance"
  | "maintainability"
  | "testing";

export type SpecialistActivityStatus =
  | "selected"
  | "not_selected";

export interface SpecialistActivity {
  id: SpecialistId;
  label: string;
  description: string;
  status: SpecialistActivityStatus;
}

export interface ReviewActivity {
  supervisor: "completed";
  specialists: SpecialistActivity[];
}

export interface ReviewResult {
  findings: Finding[];
  summary: string;
  activity?: ReviewActivity;
}

interface ReviewAgentGenerateOptions {
  hooks?: {
    beforeToolCall?: (event: {
      toolName: string;
    }) => void;
  };
}

interface ReviewAgent {
  generate(
    prompt: string,
    options?: ReviewAgentGenerateOptions,
  ): Promise<{
    text: string;
  }>;
}

const specialistActivityDefinitions: Array<{
  id: SpecialistId;
  label: string;
  description: string;
  toolName: string;
}> = [
  {
    id: "correctness",
    label: "Correctness",
    description: "Logic and behavior",
    toolName: "agent-correctnessAgent",
  },
  {
    id: "security",
    label: "Security",
    description: "Security vulnerabilities",
    toolName: "agent-securityAgent",
  },
  {
    id: "architecture",
    label: "Architecture",
    description: "Design and coupling",
    toolName: "agent-architectureAgent",
  },
  {
    id: "performance",
    label: "Performance",
    description: "Performance and scale",
    toolName: "agent-performanceAgent",
  },
  {
    id: "maintainability",
    label: "Maintainability",
    description: "Code quality",
    toolName: "agent-maintainabilityAgent",
  },
  {
    id: "testing",
    label: "Testing",
    description: "Tests and coverage",
    toolName: "agent-testingAgent",
  },
];

function buildReviewActivity(
  selectedToolNames: Set<string>,
): ReviewActivity {
  return {
    supervisor: "completed",
    specialists:
      specialistActivityDefinitions.map(
        (specialist) => ({
          id: specialist.id,
          label: specialist.label,
          description:
            specialist.description,
          status: selectedToolNames.has(
            specialist.toolName,
          )
            ? "selected"
            : "not_selected",
        }),
      ),
  };
}

function buildReviewPrompt(
  context: ReviewContext,
): string {
  const filesSection =
    context.files.length > 0
      ? context.files
          .map(
            (file) =>
              `FILE: ${file.path}\n` +
              "```text\n" +
              `${file.content}\n` +
              "```",
          )
          .join("\n\n")
      : "No additional file contents were supplied.";

  const changedFilesSection =
    context.changedFiles.length > 0
      ? context.changedFiles
          .map((file) => {
            const previous =
              file.previousPath
                ? ` (previous: ${file.previousPath})`
                : "";

            return `- ${file.status}: ${file.path}${previous}`;
          })
          .join("\n")
      : "No changed-file metadata supplied.";

  return `
You are an expert software code reviewer.

Review the supplied code evidence carefully.

Your job is to identify real, actionable problems rather than stylistic preferences.

Review these categories:

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

Review context:

Type: ${context.type}

Repository:
${context.repositoryName ?? "Not provided"}

Branch:
${context.branch ?? "Not provided"}

Commit:
${context.commit ?? "Not provided"}

Summary:
${context.summary}

Changed files:
${changedFilesSection}

Git diff:
\`\`\`diff
${context.diff || "No diff supplied."}
\`\`\`

Files:
${filesSection}

Return ONLY valid JSON matching this exact structure:

{
  "findings": [
    {
      "id": "unique-finding-id",
      "title": "Short description",
      "category": "CORRECTNESS",
      "severity": "HIGH",
      "confidence": "HIGH",
      "file": "path/to/file",
      "lineStart": 1,
      "lineEnd": 1,
      "explanation": "Why this is a problem.",
      "impact": "What could happen because of it.",
      "recommendation": "How to improve it.",
      "evidence": "Specific evidence from the supplied code.",
      "specialist": "general-reviewer"
    }
  ]
}

Rules:

1. Only report issues supported by the supplied evidence.
2. Do not invent files, functions, vulnerabilities, or behavior.
3. Prefer concrete problems over subjective style opinions.
4. If there are no meaningful findings, return an empty findings array.
5. Every finding must have a unique id.
6. The specialist field must be "general-reviewer".
7. Use file and line information only when supported by the evidence.
8. Keep explanations concise but technically useful.
`;
}

function parseModelResponse(
  text: string,
): Finding[] {
  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed: unknown =
    JSON.parse(cleaned);

  const validated =
    findingsResponseSchema.parse(parsed);

  return validated.findings;
}

function buildReviewResult(
  findings: Finding[],
): ReviewResult {
  return {
    findings,
    summary:
      findings.length === 0
        ? "No meaningful issues were identified."
        : `Identified ${findings.length} review finding${
            findings.length === 1 ? "" : "s"
          }.`,
  };
}

export async function runReview(
  context: ReviewContext,
): Promise<ReviewResult> {
  const { openRouterApiKey, modelName } =
    getConfig();

  const openrouter = createOpenAI({
    apiKey: openRouterApiKey,
    baseURL: "https://openrouter.ai/api/v1",
  });

  const prompt = buildReviewPrompt(
    context,
  );

  const result = await generateText({
    model: openrouter(modelName),
    prompt,
  });

  const findings = parseModelResponse(
    result.text,
  );

  return buildReviewResult(findings);
}

async function generateAgentReview(
  context: ReviewContext,
  agent: ReviewAgent,
): Promise<ReviewResult> {
  const prompt = buildReviewPrompt(context);

  const selectedToolNames =
    new Set<string>();

  const result = await agent.generate(
    prompt,
    {
      hooks: {
        beforeToolCall: ({ toolName }) => {
          selectedToolNames.add(
            toolName,
          );
        },
      },
    },
  );

  const findings = parseModelResponse(
    result.text,
  );

  return {
    ...buildReviewResult(findings),
    activity:
      buildReviewActivity(
        selectedToolNames,
      ),
  };
}

export async function runAgentReview(
  context: ReviewContext,
): Promise<ReviewResult> {
  return generateAgentReview(
    context,
    reviewAgent,
  );
}

export function createReviewPrompt(
  context: ReviewContext,
): string {
  return buildReviewPrompt(context);
}

export function parseReviewResponse(
  text: string,
): Finding[] {
  return parseModelResponse(text);
}

export async function runAgentReviewWithAgent(
  context: ReviewContext,
  agent: ReviewAgent,
): Promise<ReviewResult> {
  return generateAgentReview(
    context,
    agent,
  );
}
