import {
  parseSpecialistResult,
} from "./specialist-result-parser.js";

import type { ReviewFinding } from "./review-consolidator.js";

export interface SpecialistResponse {
  specialist: string;
  text?: string | null;
}

export function collectSpecialistFindings(
  responses: SpecialistResponse[],
): ReviewFinding[] {
  const findings: ReviewFinding[] = [];

  for (const response of responses) {
    const parsed = parseSpecialistResult(response.text);

    for (const finding of parsed.findings) {
      findings.push({
        ...finding,
        specialist: finding.specialist || response.specialist,
      });
    }
  }

  return findings;
}
