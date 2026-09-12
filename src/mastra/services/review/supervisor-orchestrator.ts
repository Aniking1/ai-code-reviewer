import {
  collectSpecialistFindings,
  type SpecialistResponse,
} from "./specialist-findings.js";

import {
  consolidateFindings,
  type ConsolidatedReview,
} from "./review-consolidator.js";

export interface SupervisorReviewInput {
  specialistResponses: SpecialistResponse[];
}

export interface SupervisorReviewResult
  extends ConsolidatedReview {
  specialistCount: number;
  parsedFindingCount: number;
}

export function runSupervisorOrchestration(
  input: SupervisorReviewInput,
): SupervisorReviewResult {
  const findings = collectSpecialistFindings(
    input.specialistResponses,
  );

  const consolidated = consolidateFindings(findings);

  return {
    ...consolidated,
    specialistCount:
      input.specialistResponses.length,
    parsedFindingCount: findings.length,
  };
}
