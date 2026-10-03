import { z } from "zod";

import { reviewAgent } from "../../agents/review-agent.js";
import {
  findingSchema,
  type Finding,
} from "../../schemas/finding.js";
import type { ReviewContext } from "./review-context-service.js";

const recommendationSchema = z.enum([
  "APPROVE",
  "APPROVE WITH COMMENTS",
  "REQUEST CHANGES",
  "BLOCK MERGE",
]);

const findingsResponseSchema = z.object({
  findings: z.array(findingSchema),
  recommendation:
    recommendationSchema.optional(),
  summary: z.string().optional(),
});

export type ReviewRecommendation =
  z.infer<typeof recommendationSchema>;

export interface SpecialistActivity {
  id: string;
  label: string;
  description: string;
  status:
    | "selected"
    | "not_selected";
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

interface ModelReviewResponse {
  findings: Finding[];
  recommendation?: ReviewRecommendation;
  summary?: string;
}

interface ReviewAgentLike {
  generate: (
    prompt: string,
    options?: {
      hooks?: {
        beforeToolCall?: (
          event: {
            toolName: string;
          },
        ) => void;
      };
    },
  ) => Promise<unknown>;
}

interface SpecialistDefinition {
  id: string;
  label: string;
  description: string;
  toolNames: string[];
}

const specialistDefinitions: SpecialistDefinition[] = [
  {
    id: "correctness",
    label: "Correctness",
    description:
      "Logic and behavior",
    toolNames: [
      "agent-correctnessAgent",
      "correctnessAgent",
      "correctness-logic-agent",
      "agent-correctness-logic-agent",
    ],
  },
  {
    id: "security",
    label: "Security",
    description:
      "Security vulnerabilities",
    toolNames: [
      "agent-securityAgent",
      "securityAgent",
      "security-agent",
      "agent-security-agent",
    ],
  },
  {
    id: "architecture",
    label: "Architecture",
    description:
      "Design and coupling",
    toolNames: [
      "agent-architectureAgent",
      "architectureAgent",
      "architecture-design-agent",
      "agent-architecture-design-agent",
    ],
  },
  {
    id: "performance",
    label: "Performance",
    description:
      "Performance and scale",
    toolNames: [
      "agent-performanceAgent",
      "performanceAgent",
      "performance-scalability-agent",
      "agent-performance-scalability-agent",
    ],
  },
  {
    id: "maintainability",
    label: "Maintainability",
    description:
      "Code quality",
    toolNames: [
      "agent-maintainabilityAgent",
      "maintainabilityAgent",
      "code-quality-maintainability-agent",
      "agent-code-quality-maintainability-agent",
    ],
  },
  {
    id: "testing",
    label: "Testing",
    description:
      "Tests and coverage",
    toolNames: [
      "agent-testingAgent",
      "testingAgent",
      "testing-agent",
      "agent-testing-agent",
    ],
  },
];

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

            return (
              `- ${file.status}: ${file.path}` +
              `${previous}`
            );
          })
          .join("\n")
      : "No changed-file metadata supplied.";

  return `
You are the Code Review Supervisor in an agentic AI code review system.

You are also an expert software code reviewer.

Your responsibility is to coordinate a high-signal software code review
by examining the supplied review target, selecting relevant specialist
review agents, delegating review work, validating important findings,
rejecting unsupported findings, consolidating overlapping findings,
and producing one final actionable review.

You must:

1. Understand the supplied review target.
2. Inspect repository evidence when necessary.
3. Determine which specialist review areas are relevant.
4. Delegate only relevant work to specialist agents.
5. Collect specialist findings.
6. Cross-validate important HIGH and CRITICAL findings when another
   specialist can meaningfully validate the same concern.
7. Reject unsupported or speculative findings.
8. Consolidate duplicate or overlapping findings.
9. Preserve the strongest justified severity and confidence.
10. Produce one concise final review.

AVAILABLE SPECIALISTS:

1. correctnessAgent
   Focus:
   - logical errors
   - incorrect behavior
   - business logic
   - calculations
   - control flow
   - validation
   - error handling
   - edge cases

2. securityAgent
   Focus:
   - authentication
   - authorization
   - permissions
   - credentials
   - tokens
   - sessions
   - user input
   - injection
   - database queries
   - shell commands
   - sensitive data
   - trust boundaries
   - security configuration

3. architectureAgent
   Focus:
   - module boundaries
   - service boundaries
   - APIs
   - abstractions
   - dependency direction
   - layering
   - coupling
   - responsibility placement
   - significant refactoring
   - system structure

4. performanceAgent
   Focus:
   - inefficient algorithms
   - loops
   - repeated I/O
   - database queries
   - network requests
   - concurrency
   - memory
   - caching
   - large datasets
   - throughput
   - resource usage

5. maintainabilityAgent
   Focus:
   - significant duplication
   - complex logic
   - modularity
   - readability
   - dead code
   - fragile patterns
   - maintainability risks

6. testingAgent
   Focus:
   - missing regression tests
   - missing edge-case tests
   - changed failure paths
   - missing tests for changed behavior
   - significant testing weaknesses

SPECIALIST SELECTION:

Do NOT invoke every specialist automatically.

Select a specialist only when the review target contains evidence relevant
to that specialist's area.

HIGH-SEVERITY CROSS-VALIDATION:

When a specialist reports a CRITICAL or HIGH finding, consider whether
another relevant specialist can independently validate the same underlying
concern.

Examples:

- Security issue involving business logic:
  cross-check with correctnessAgent.

- Architecture issue involving expensive processing:
  cross-check with performanceAgent.

- Correctness issue involving missing failure-path tests:
  cross-check with testingAgent.

Do not invoke another specialist when meaningful cross-validation is not
possible.

REPOSITORY INSPECTION:

Use repository tools when necessary.

Specialists may inspect files outside the directly changed files when those
files are required to establish the correctness of a finding.

HIGH-SIGNAL POLICY:

Only report issues supported by concrete evidence.

Do NOT report issues based only on:

- personal preference
- generic best practice
- hypothetical future requirements
- invented requirements
- unsupported assumptions
- speculative vulnerabilities
- stylistic disagreement

Prefer a small number of concrete, actionable findings.

FINDINGS:

Every finding should contain:

- id
- title
- category
- severity
- confidence
- file when supported
- lineStart when supported
- lineEnd when supported
- explanation
- impact
- recommendation
- evidence
- specialist

Allowed categories:

- CORRECTNESS
- SECURITY
- ARCHITECTURE
- PERFORMANCE
- MAINTAINABILITY
- TESTING

Allowed severities:

- CRITICAL
- HIGH
- MEDIUM
- LOW
- OPTIONAL

Allowed confidence levels:

- VERY_HIGH
- HIGH
- MEDIUM
- LOW

Never fabricate file paths or line numbers.

DEDUPLICATION:

Two findings describing the same underlying defect must not be reported
twice.

When overlapping findings exist:

- retain the strongest evidence
- preserve the most accurate category
- preserve the strongest justified severity
- preserve the strongest justified confidence
- combine useful supporting evidence when appropriate

FINAL RECOMMENDATION POLICY:

- BLOCK MERGE:
  At least one confirmed CRITICAL finding remains.

- REQUEST CHANGES:
  At least one confirmed HIGH finding remains.

- APPROVE WITH COMMENTS:
  No CRITICAL or HIGH findings remain, but MEDIUM, LOW, or OPTIONAL
  findings remain.

- APPROVE:
  No meaningful findings remain.

REVIEW CONTEXT:

Type:
${context.type}

Repository:
${context.repositoryName ?? "Not provided"}

Repository path:
${context.repositoryPath ?? "Not provided"}

Branch:
${context.branch ?? "Not provided"}

Commit:
${context.commit ?? "Not provided"}

Base reference:
${context.baseRef ?? "Not provided"}

Target reference:
${context.targetRef ?? "Not provided"}

Summary:
${context.summary}

Changed files:
${changedFilesSection}

Git diff:
\`\`\`diff
${context.diff || "No diff supplied."}
\`\`\`

Repository files:
${filesSection}

FINAL RESPONSE:

Return ONLY valid JSON.

JSON OUTPUT RULES:

- findings must always be an array.
- Do NOT use null for optional finding fields. Omit file, lineStart,
  lineEnd, recommendation, or evidence when the value is unavailable.
- Use the exact uppercase values shown in the allowed category, severity,
  and confidence lists.
- Every finding must contain id, title, category, severity, confidence,
  explanation, impact, and specialist.
- lineStart and lineEnd must be positive integers when supplied.

Use this structure:

{
  "recommendation": "APPROVE | APPROVE WITH COMMENTS | REQUEST CHANGES | BLOCK MERGE",
  "summary": "Concise overall review summary.",
  "findings": [
    {
      "id": "UNIQUE-ID",
      "title": "Short finding title",
      "category": "CORRECTNESS | SECURITY | ARCHITECTURE | PERFORMANCE | MAINTAINABILITY | TESTING",
      "severity": "CRITICAL | HIGH | MEDIUM | LOW | OPTIONAL",
      "confidence": "VERY_HIGH | HIGH | MEDIUM | LOW",
      "file": "path/to/file",
      "lineStart": 1,
      "lineEnd": 1,
      "explanation": "Why the issue exists.",
      "impact": "Potential engineering impact.",
      "recommendation": "Practical remediation.",
      "evidence": "Concrete repository evidence.",
      "specialist": "Specialist that identified or validated the issue."
    }
  ]
}

When no meaningful findings are supported, return:

{
  "recommendation": "APPROVE",
  "summary": "No meaningful engineering issues were identified from the available evidence.",
  "findings": []
}

Remember:

- Inspect before concluding.
- Delegate selectively.
- Cross-validate important findings when useful.
- Do not speculate.
- Do not duplicate findings.
- Do not fabricate evidence.
`;
}

function cleanModelResponse(
  text: string,
): string {
  const trimmed = text.trim();

  const withoutOpeningFence =
    trimmed.replace(
      /^```(?:json)?\s*/i,
      "",
    );

  const withoutClosingFence =
    withoutOpeningFence.replace(
      /\s*```$/i,
      "",
    );

  return withoutClosingFence.trim();
}

function normalizeEnumToken(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  return value
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

function normalizeRecommendationToken(
  value: unknown,
): unknown {
  if (typeof value !== "string") {
    return value;
  }

  return value
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function normalizePositiveInteger(
  value: unknown,
): number | undefined {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return undefined;
  }

  if (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value > 0
  ) {
    return value;
  }

  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const parsed = Number(value.trim());

    if (
      Number.isInteger(parsed) &&
      parsed > 0
    ) {
      return parsed;
    }
  }

  return undefined;
}

function normalizeFindingForSchema(
  value: unknown,
): unknown {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return value;
  }

  const source =
    value as Record<string, unknown>;

  const finding = {
    ...source,
  };

  if (
    finding.category !== null &&
    finding.category !== undefined
  ) {
    finding.category =
      normalizeEnumToken(
        finding.category,
      );
  }

  if (
    finding.severity !== null &&
    finding.severity !== undefined
  ) {
    finding.severity =
      normalizeEnumToken(
        finding.severity,
      );
  }

  if (
    finding.confidence !== null &&
    finding.confidence !== undefined
  ) {
    finding.confidence =
      normalizeEnumToken(
        finding.confidence,
      );
  }

  if (
    finding.specialist === null ||
    finding.specialist === undefined
  ) {
    delete finding.specialist;
  } else if (
    typeof finding.specialist === "string"
  ) {
    finding.specialist =
      finding.specialist.trim();
  }

  for (
    const optionalField of [
      "file",
      "recommendation",
      "evidence",
    ]
  ) {
    if (
      finding[optionalField] === null ||
      finding[optionalField] === undefined
    ) {
      delete finding[optionalField];
    }
  }

  for (
    const locationField of [
      "lineStart",
      "lineEnd",
    ]
  ) {
    const normalized =
      normalizePositiveInteger(
        finding[locationField],
      );

    if (normalized === undefined) {
      delete finding[locationField];
    } else {
      finding[locationField] =
        normalized;
    }
  }

  return finding;
}

function normalizeModelResponseShape(
  value: unknown,
): unknown {
  if (Array.isArray(value)) {
    return {
      findings:
        value.map(
          normalizeFindingForSchema,
        ),
    };
  }

  if (
    value === null ||
    typeof value !== "object"
  ) {
    return value;
  }

  const response = {
    ...(value as Record<
      string,
      unknown
    >),
  };

  if (
    response.recommendation === null ||
    response.recommendation === undefined
  ) {
    delete response.recommendation;
  } else {
    response.recommendation =
      normalizeRecommendationToken(
        response.recommendation,
      );
  }

  if (
    response.summary === null ||
    response.summary === undefined
  ) {
    delete response.summary;
  }

  if (Array.isArray(response.findings)) {
    response.findings =
      response.findings.map(
        normalizeFindingForSchema,
      );

    return response;
  }

  if (Array.isArray(response.issues)) {
    response.findings =
      response.issues.map(
        normalizeFindingForSchema,
      );

    delete response.issues;

    return response;
  }

  return response;
}

function parseModelResponse(
  text: string,
): ModelReviewResponse {
  const cleaned =
    cleanModelResponse(text);

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const firstOpening =
      Math.min(
        ...[
          cleaned.indexOf("{"),
          cleaned.indexOf("["),
        ].filter(
          (index) => index >= 0,
        ),
      );

    const lastClosing = Math.max(
      cleaned.lastIndexOf("}"),
      cleaned.lastIndexOf("]"),
    );

    if (
      !Number.isFinite(firstOpening) ||
      lastClosing === -1 ||
      lastClosing <= firstOpening
    ) {
      throw new Error(
        "The model returned invalid JSON.",
      );
    }

    const possibleJson =
      cleaned.slice(
        firstOpening,
        lastClosing + 1,
      );

    try {
      parsed =
        JSON.parse(
          possibleJson,
        );
    } catch {
      throw new Error(
        "The model returned invalid JSON.",
      );
    }
  }

  const normalized =
    normalizeModelResponseShape(
      parsed,
    );

  const validated =
    findingsResponseSchema.safeParse(
      normalized,
    );

  if (!validated.success) {
    const issues =
      validated.error.issues
        .map((issue) => {
          const path =
            issue.path.length > 0
              ? issue.path.join(".")
              : "<root>";

          return `${path}: ${issue.message}`;
        })
        .join("; ");

    throw new Error(
      "The model response did not match the required review schema. " +
        `Validation errors: ${issues}`,
    );
  }

  return validated.data;
}

function normalizeSpecialistName(
  specialist: string,
): string {
  const key =
    specialist.trim().toLowerCase();

  const aliases: Record<
    string,
    string
  > = {
    "correctnessagent":
      "correctness-logic",
    "agent-correctnessagent":
      "correctness-logic",
    "correctness-logic-agent":
      "correctness-logic",
    "correctness-logic":
      "correctness-logic",

    "securityagent":
      "security",
    "agent-securityagent":
      "security",
    "security-agent":
      "security",
    "security":
      "security",

    "architectureagent": "architecture",
    "agent-architectureagent": "architecture",
    "architecture-design-agent": "architecture",
    "architecture-design": "architecture",

    "performanceagent":
      "performance-scalability",
    "agent-performanceagent":
      "performance-scalability",
    "performance-scalability-agent":
      "performance-scalability",
    "performance-scalability":
      "performance-scalability",

    "maintainabilityagent":
      "code-quality-maintainability",
    "agent-maintainabilityagent":
      "code-quality-maintainability",
    "code-quality-maintainability-agent":
      "code-quality-maintainability",
    "code-quality-maintainability":
      "code-quality-maintainability",

    "testingagent":
      "testing",
    "agent-testingagent":
      "testing",
    "testing-agent":
      "testing",
    "testing":
      "testing",
  };

  return (
    aliases[key] ??
    specialist.trim()
  );
}

function buildSummary(
  findings: Finding[],
  modelSummary?: string,
): string {
  const trimmedSummary =
    modelSummary?.trim();

  if (trimmedSummary) {
    return trimmedSummary;
  }

  if (findings.length === 0) {
    return (
      "No meaningful engineering issues were identified " +
      "from the available evidence."
    );
  }

  return (
    `Identified ${findings.length} review finding` +
    `${findings.length === 1 ? "" : "s"}.`
  );
}

function buildReviewResult(
  findings: Finding[],
  summary?: string,
  activity?: ReviewActivity,
): ReviewResult {
  const normalizedFindings =
    findings.map((finding) => ({
      ...finding,
      specialist:
        normalizeSpecialistName(
          finding.specialist,
        ),
    }));

  return {
    findings:
      normalizedFindings,
    summary:
      buildSummary(
        normalizedFindings,
        summary,
      ),
    ...(activity
      ? { activity }
      : {}),
  };
}

function collectToolNames(
  value: unknown,
  toolNames: Set<string>,
  visited: Set<object>,
): void {
  if (
    value === null ||
    value === undefined
  ) {
    return;
  }

  if (typeof value !== "object") {
    return;
  }

  const objectValue =
    value as Record<
      string,
      unknown
    >;

  if (visited.has(objectValue)) {
    return;
  }

  visited.add(objectValue);

  const directToolName =
    objectValue.toolName;

  if (
    typeof directToolName === "string" &&
    directToolName.trim()
  ) {
    toolNames.add(
      directToolName.trim(),
    );
  }

  const directName =
    objectValue.name;

  if (
    typeof directName === "string" &&
    directName.trim()
  ) {
    toolNames.add(
      directName.trim(),
    );
  }

  const functionValue =
    objectValue.function;

  if (
    functionValue !== null &&
    typeof functionValue === "object"
  ) {
    const functionName =
      (
        functionValue as Record<
          string,
          unknown
        >
      ).name;

    if (
      typeof functionName === "string" &&
      functionName.trim()
    ) {
      toolNames.add(
        functionName.trim(),
      );
    }
  }

  for (const child of Object.values(
    objectValue,
  )) {
    collectToolNames(
      child,
      toolNames,
      visited,
    );
  }
}

function extractToolNames(
  value: unknown,
): Set<string> {
  const toolNames =
    new Set<string>();

  collectToolNames(
    value,
    toolNames,
    new Set<object>(),
  );

  return toolNames;
}

function specialistWasSelected(
  specialist: SpecialistDefinition,
  toolNames: Set<string>,
): boolean {
  const normalizedToolNames =
    new Set(
      [...toolNames].map((name) =>
        name.trim().toLowerCase(),
      ),
    );

  return specialist.toolNames.some(
    (toolName) =>
      normalizedToolNames.has(
        toolName.toLowerCase(),
      ),
  );
}

export function buildReviewActivity(
  result: unknown,
  observedToolNames: Iterable<string> = [],
): ReviewActivity {
  const toolNames =
    extractToolNames(result);

  for (const toolName of observedToolNames) {
    if (
      typeof toolName === "string" &&
      toolName.trim()
    ) {
      toolNames.add(
        toolName.trim(),
      );
    }
  }

  const specialists: SpecialistActivity[] =
    specialistDefinitions.map(
      (
        specialist,
      ): SpecialistActivity => ({
        id: specialist.id,
        label: specialist.label,
        description:
          specialist.description,
        status:
          specialistWasSelected(
            specialist,
            toolNames,
          )
            ? "selected"
            : "not_selected",
      }),
    );

  return {
    supervisor: "completed",
    specialists,
  };
}

async function generateAgentReview(
  context: ReviewContext,
  agent: ReviewAgentLike,
): Promise<ReviewResult> {
  const prompt =
    buildReviewPrompt(context);

  const observedToolNames =
    new Set<string>();

  const result =
    await agent.generate(
      prompt,
      {
        hooks: {
          beforeToolCall: (
            event,
          ) => {
            if (
              typeof event?.toolName ===
                "string" &&
              event.toolName.trim()
            ) {
              observedToolNames.add(
                event.toolName.trim(),
              );
            }
          },
        },
      },
    );

  const resultRecord =
    result !== null &&
    typeof result === "object"
      ? (
          result as Record<
            string,
            unknown
          >
        )
      : undefined;

  const text =
    typeof resultRecord?.text ===
    "string"
      ? resultRecord.text
      : "";

  if (!text.trim()) {
    throw new Error(
      "The review Supervisor returned an empty response.",
    );
  }

  const parsed =
    parseModelResponse(text);

  const activity =
    buildReviewActivity(
      result,
      observedToolNames,
    );

  return buildReviewResult(
    parsed.findings,
    parsed.summary,
    activity,
  );
}

export async function runReview(
  context: ReviewContext,
): Promise<ReviewResult> {
  return generateAgentReview(
    context,
    reviewAgent,
  );
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
  return parseModelResponse(
    text,
  ).findings;
}

export async function runAgentReviewWithAgent(
  context: ReviewContext,
  agent: ReviewAgentLike,
): Promise<ReviewResult> {
  return generateAgentReview(
    context,
    agent,
  );
}