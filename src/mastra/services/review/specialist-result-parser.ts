import {
  reviewFindingSchema,
  type ReviewFinding,
} from "./review-consolidator.js";

export interface ParsedSpecialistResult {
  findings: ReviewFinding[];
  rawText: string;
  wasJson: boolean;
}

function extractJsonCandidates(text: string): string[] {
  const candidates: string[] = [];

  const fencedMatches = text.match(
    /```(?:json)?\s*([\s\S]*?)\s*```/gi,
  );

  if (fencedMatches) {
    for (const match of fencedMatches) {
      const content = match
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      if (content) {
        candidates.push(content);
      }
    }
  }

  const trimmed = text.trim();

  if (
    trimmed.startsWith("{") &&
    trimmed.endsWith("}")
  ) {
    candidates.push(trimmed);
  }

  if (
    trimmed.startsWith("[") &&
    trimmed.endsWith("]")
  ) {
    candidates.push(trimmed);
  }

  const firstObject = text.indexOf("{");
  const lastObject = text.lastIndexOf("}");

  if (firstObject !== -1 && lastObject > firstObject) {
    candidates.push(
      text.slice(firstObject, lastObject + 1).trim(),
    );
  }

  const firstArray = text.indexOf("[");
  const lastArray = text.lastIndexOf("]");

  if (firstArray !== -1 && lastArray > firstArray) {
    candidates.push(
      text.slice(firstArray, lastArray + 1).trim(),
    );
  }

  return [...new Set(candidates)];
}

function parseJsonCandidate(
  candidate: string,
): unknown {
  try {
    return JSON.parse(candidate);
  } catch {
    return undefined;
  }
}

function extractFindings(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    "findings" in value
  ) {
    const findings = (value as { findings?: unknown })
      .findings;

    if (Array.isArray(findings)) {
      return findings;
    }
  }

  return [];
}

function validateFindings(
  findings: unknown[],
): ReviewFinding[] {
  const validated: ReviewFinding[] = [];

  for (const finding of findings) {
    const result =
      reviewFindingSchema.safeParse(finding);

    if (result.success) {
      validated.push(result.data);
    }
  }

  return validated;
}

export function parseSpecialistResult(
  text: string | null | undefined,
): ParsedSpecialistResult {
  const rawText = text ?? "";

  if (!rawText.trim()) {
    return {
      findings: [],
      rawText,
      wasJson: false,
    };
  }

  const candidates = extractJsonCandidates(rawText);

  for (const candidate of candidates) {
    const parsed = parseJsonCandidate(candidate);

    if (parsed === undefined) {
      continue;
    }

    const findings = validateFindings(
      extractFindings(parsed),
    );

    return {
      findings,
      rawText,
      wasJson: true,
    };
  }

  return {
    findings: [],
    rawText,
    wasJson: false,
  };
}
