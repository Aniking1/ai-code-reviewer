import { z } from "zod";

const severitySchema = z.enum([
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "OPTIONAL",
]);

const confidenceSchema = z.enum([
  "VERY_HIGH",
  "HIGH",
  "MEDIUM",
  "LOW",
]);

const categorySchema = z.enum([
  "CORRECTNESS",
  "SECURITY",
  "ARCHITECTURE",
  "PERFORMANCE",
  "MAINTAINABILITY",
  "TESTING",
]);

export const reviewFindingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: categorySchema,
  severity: severitySchema,
  confidence: confidenceSchema,
  file: z.string().min(1).optional(),
  lineStart: z.number().int().positive().optional(),
  lineEnd: z.number().int().positive().optional(),
  explanation: z.string().min(1),
  impact: z.string().min(1),
  recommendation: z.string().min(1),
  evidence: z.string().min(1),
  specialist: z.string().min(1),
});

export type ReviewFinding = z.infer<typeof reviewFindingSchema>;

export const reviewRecommendationSchema = z.enum([
  "APPROVE",
  "APPROVE WITH COMMENTS",
  "REQUEST CHANGES",
  "BLOCK MERGE",
]);

export const consolidatedReviewSchema = z.object({
  recommendation: reviewRecommendationSchema,
  summary: z.string(),
  findings: z.array(reviewFindingSchema),
});

export type ConsolidatedReview = z.infer<
  typeof consolidatedReviewSchema
>;

const severityRank: Record<ReviewFinding["severity"], number> = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  OPTIONAL: 1,
};

const confidenceRank: Record<ReviewFinding["confidence"], number> = {
  VERY_HIGH: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function findingKey(finding: ReviewFinding): string {
  return [
    finding.category,
    finding.file ?? "",
    finding.lineStart ?? "",
    finding.lineEnd ?? "",
    normalizeText(finding.title),
  ].join("|");
}

function isSameUnderlyingFinding(
  left: ReviewFinding,
  right: ReviewFinding,
): boolean {
  if (left.category !== right.category) {
    return false;
  }

  if (
    left.file &&
    right.file &&
    left.file !== right.file
  ) {
    return false;
  }

  const leftTitle = normalizeText(left.title);
  const rightTitle = normalizeText(right.title);

  if (
    leftTitle === rightTitle ||
    leftTitle.includes(rightTitle) ||
    rightTitle.includes(leftTitle)
  ) {
    return true;
  }

  const leftEvidence = normalizeText(left.evidence);
  const rightEvidence = normalizeText(right.evidence);

  return (
    leftEvidence === rightEvidence ||
    leftEvidence.includes(rightEvidence) ||
    rightEvidence.includes(leftEvidence)
  );
}

function compareFindings(
  left: ReviewFinding,
  right: ReviewFinding,
): number {
  const severityDifference =
    severityRank[right.severity] -
    severityRank[left.severity];

  if (severityDifference !== 0) {
    return severityDifference;
  }

  const confidenceDifference =
    confidenceRank[right.confidence] -
    confidenceRank[left.confidence];

  if (confidenceDifference !== 0) {
    return confidenceDifference;
  }

  return left.id.localeCompare(right.id);
}

function selectStrongerFinding(
  left: ReviewFinding,
  right: ReviewFinding,
): ReviewFinding {
  const comparison = compareFindings(left, right);

  if (comparison < 0) {
    return left;
  }

  if (comparison > 0) {
    return right;
  }

  if (left.evidence.length >= right.evidence.length) {
    return left;
  }

  return right;
}

export function validateFindings(
  findings: unknown[],
): ReviewFinding[] {
  const validFindings: ReviewFinding[] = [];

  for (const finding of findings) {
    const result = reviewFindingSchema.safeParse(finding);

    if (result.success) {
      validFindings.push(result.data);
    }
  }

  return validFindings;
}

export function deduplicateFindings(
  findings: ReviewFinding[],
): ReviewFinding[] {
  const unique: ReviewFinding[] = [];
  const byKey = new Map<string, number>();

  for (const finding of findings) {
    const key = findingKey(finding);
    const existingIndex = byKey.get(key);

    if (existingIndex === undefined) {
      byKey.set(key, unique.length);
      unique.push(finding);
      continue;
    }

    unique[existingIndex] = selectStrongerFinding(
      unique[existingIndex],
      finding,
    );
  }

  const deduplicated: ReviewFinding[] = [];

  for (const finding of unique) {
    const duplicateIndex = deduplicated.findIndex(
      (existing) =>
        existing !== finding &&
        isSameUnderlyingFinding(existing, finding),
    );

    if (duplicateIndex === -1) {
      deduplicated.push(finding);
      continue;
    }

    deduplicated[duplicateIndex] = selectStrongerFinding(
      deduplicated[duplicateIndex],
      finding,
    );
  }

  return deduplicated;
}

export function sortFindings(
  findings: ReviewFinding[],
): ReviewFinding[] {
  return [...findings].sort(compareFindings);
}

export function determineRecommendation(
  findings: Array<Pick<ReviewFinding, "severity">>,
): z.infer<typeof reviewRecommendationSchema> {
  if (
    findings.some(
      (finding) => finding.severity === "CRITICAL",
    )
  ) {
    return "BLOCK MERGE";
  }

  if (
    findings.some(
      (finding) => finding.severity === "HIGH",
    )
  ) {
    return "REQUEST CHANGES";
  }

  if (findings.length > 0) {
    return "APPROVE WITH COMMENTS";
  }

  return "APPROVE";
}

export function summarizeFindings(
  recommendation: z.infer<typeof reviewRecommendationSchema>,
  findings: ReviewFinding[],
): string {
  if (findings.length === 0) {
    return "No meaningful engineering issues were identified from the available evidence.";
  }

  const counts = findings.reduce<
    Record<ReviewFinding["severity"], number>
  >(
    (accumulator, finding) => {
      accumulator[finding.severity] += 1;
      return accumulator;
    },
    {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      OPTIONAL: 0,
    },
  );

  const parts = [
    counts.CRITICAL > 0
      ? `${counts.CRITICAL} critical`
      : "",
    counts.HIGH > 0
      ? `${counts.HIGH} high`
      : "",
    counts.MEDIUM > 0
      ? `${counts.MEDIUM} medium`
      : "",
    counts.LOW > 0
      ? `${counts.LOW} low`
      : "",
    counts.OPTIONAL > 0
      ? `${counts.OPTIONAL} optional`
      : "",
  ].filter(Boolean);

  return `${recommendation}: ${findings.length} finding(s) identified (${parts.join(", ")}).`;
}

export function consolidateFindings(
  rawFindings: unknown[],
): ConsolidatedReview {
  const validFindings = validateFindings(rawFindings);
  const deduplicated = deduplicateFindings(validFindings);
  const findings = sortFindings(deduplicated);
  const recommendation = determineRecommendation(findings);
  const summary = summarizeFindings(
    recommendation,
    findings,
  );

  return {
    recommendation,
    summary,
    findings,
  };
}
