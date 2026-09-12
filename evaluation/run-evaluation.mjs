import {
  execFileSync,
} from "node:child_process";

import {
  promises as fs,
} from "node:fs";

import path from "node:path";

import {
  runReview,
} from "../src/mastra/services/review/review-service.ts";

const scenarios = [
  {
    name: "evaluation-01-correctness",
    repositoryPath:
      "./workspace/repositories/evaluation-01-correctness",
    expectedCategory: "CORRECTNESS",
    expectedSpecialist: "correctness-logic",
    expectedSeverities: [
      "HIGH",
      "CRITICAL",
    ],
    defect:
      "Guest customers incorrectly receive a discount.",
  },

  {
    name: "evaluation-02-security",
    repositoryPath:
      "./workspace/repositories/evaluation-02-security",
    expectedCategory: "SECURITY",
    expectedSpecialist: "security",
    expectedSeverities: [
      "HIGH",
      "CRITICAL",
    ],
    defect:
      "User-controlled input reaches shell command execution.",
  },

  {
    name: "evaluation-03-architecture",
    repositoryPath:
      "./workspace/repositories/evaluation-03-architecture",
    expectedCategory: "ARCHITECTURE",
    expectedSpecialist: "architecture",
    expectedSeverities: [
      "MEDIUM",
      "HIGH",
      "CRITICAL",
    ],
    defect:
      "UserService bypasses the repository abstraction.",
  },

  {
    name: "evaluation-04-performance",
    repositoryPath:
      "./workspace/repositories/evaluation-04-performance",
    expectedCategory: "PERFORMANCE",
    expectedSpecialist: "performance-scalability",
    expectedSeverities: [
      "HIGH",
      "CRITICAL",
    ],
    defect:
      "User matching uses nested linear searches.",
  },

  {
    name: "evaluation-05-maintainability",
    repositoryPath:
      "./workspace/repositories/evaluation-05-maintainability",
    expectedCategory: "MAINTAINABILITY",
    expectedSpecialist:
      "code-quality-maintainability",
    expectedSeverities: [
      "MEDIUM",
      "HIGH",
    ],
    defect:
      "Discount logic is duplicated.",
  },
];

function git(
  repositoryPath,
  args,
) {
  return execFileSync(
    "git",
    [
      "-C",
      repositoryPath,
      ...args,
    ],
    {
      encoding: "utf8",
    },
  ).trim();
}

async function validateFixture(
  scenario,
) {
  const absolutePath =
    path.resolve(
      scenario.repositoryPath,
    );

  const checks = {
    repositoryExists: false,
    gitRepository: false,
    hasHead: false,
    hasParentCommit: false,
    hasDiff: false,
    workingTreeClean: false,
  };

  try {
    const stats =
      await fs.stat(
        absolutePath,
      );

    checks.repositoryExists =
      stats.isDirectory();
  } catch {
    return {
      valid: false,
      checks,
      error:
        "Repository directory does not exist.",
    };
  }

  try {
    git(
      scenario.repositoryPath,
      [
        "rev-parse",
        "--is-inside-work-tree",
      ],
    );

    checks.gitRepository = true;
  } catch {
    return {
      valid: false,
      checks,
      error:
        "Directory is not a Git repository.",
    };
  }

  try {
    git(
      scenario.repositoryPath,
      [
        "rev-parse",
        "HEAD",
      ],
    );

    checks.hasHead = true;
  } catch {
    return {
      valid: false,
      checks,
      error:
        "Repository has no HEAD commit.",
    };
  }

  try {
    git(
      scenario.repositoryPath,
      [
        "rev-parse",
        "HEAD~1",
      ],
    );

    checks.hasParentCommit = true;
  } catch {
    return {
      valid: false,
      checks,
      error:
        "Repository does not have a baseline parent commit.",
    };
  }

  const diff =
    git(
      scenario.repositoryPath,
      [
        "diff",
        "HEAD~1",
        "HEAD",
      ],
    );

  checks.hasDiff =
    diff.length > 0;

  const status =
    git(
      scenario.repositoryPath,
      [
        "status",
        "--short",
      ],
    );

  checks.workingTreeClean =
    status.length === 0;

  const valid =
    Object.values(checks).every(
      Boolean,
    );

  return {
    valid,
    checks,
    diffLength: diff.length,
    error: valid
      ? undefined
      : "Fixture validation failed.",
  };
}

function evaluateFindings(
  findings,
  scenario,
) {
  const categoryMatches =
    findings.filter(
      (finding) =>
        finding.category ===
        scenario.expectedCategory,
    );

  const severityMatches =
    categoryMatches.filter(
      (finding) =>
        scenario.expectedSeverities.includes(
          finding.severity,
        ),
    );

  const specialistMatches =
    severityMatches.filter(
      (finding) =>
        finding.specialist ===
        scenario.expectedSpecialist,
    );

  return {
    detected:
      categoryMatches.length > 0,

    severityMatch:
      severityMatches.length > 0,

    specialistMatch:
      specialistMatches.length > 0,

    passed:
      specialistMatches.length > 0,

    matchingFindings:
      specialistMatches,
  };
}

const report = {
  generatedAt:
    new Date().toISOString(),

  model:
    process.env.MODEL_NAME ??
    "not configured",

  fixtureValidation: [],

  liveAiEvaluation: [],
};

console.log(
  "\nAI CODE REVIEWER — EVALUATION REPORT\n",
);

console.log(
  "====================================",
);

console.log(
  "\nFIXTURE VALIDATION\n",
);

for (const scenario of scenarios) {
  const fixture =
    await validateFixture(
      scenario,
    );

  report.fixtureValidation.push({
    scenario: scenario.name,
    valid: fixture.valid,
    checks: fixture.checks,
    diffLength:
      fixture.diffLength ?? 0,
    error: fixture.error,
  });

  console.log(
    `${scenario.name}: ${
      fixture.valid
        ? "PASS"
        : "FAIL"
    }`,
  );

  console.log(
    `  Diff: ${
      fixture.diffLength ?? 0
    } characters`,
  );

  if (fixture.error) {
    console.log(
      `  Error: ${fixture.error}`,
    );
  }
}

console.log(
  "\nLIVE AI EVALUATION\n",
);

for (const scenario of scenarios) {
  console.log(
    `=== ${scenario.name} ===`,
  );

  const fixture =
    report.fixtureValidation.find(
      (item) =>
        item.scenario ===
        scenario.name,
    );

  if (!fixture?.valid) {
    report.liveAiEvaluation.push({
      scenario: scenario.name,
      status: "FIXTURE_ERROR",
      expectedCategory:
        scenario.expectedCategory,
      expectedSpecialist:
        scenario.expectedSpecialist,
      expectedSeverities:
        scenario.expectedSeverities,
      defect: scenario.defect,
    });

    console.log(
      "Status: FIXTURE_ERROR",
    );

    continue;
  }

  try {
    const result =
      await runReview(
        {
          type: "commit",
          repositoryPath:
            scenario.repositoryPath,
          commit: "HEAD",
        },
        {
          saveToHistory: false,
        },
      );

    const evaluation =
      evaluateFindings(
        result.review.findings,
        scenario,
      );

    report.liveAiEvaluation.push({
      scenario: scenario.name,
      status:
        evaluation.passed
          ? "PASS"
          : "FAIL",
      expectedCategory:
        scenario.expectedCategory,
      expectedSpecialist:
        scenario.expectedSpecialist,
      expectedSeverities:
        scenario.expectedSeverities,
      defect: scenario.defect,
      detected:
        evaluation.detected,
      severityMatch:
        evaluation.severityMatch,
      specialistMatch:
        evaluation.specialistMatch,
      findings:
        result.review.findings,
      summary:
        result.review.summary,
    });

    console.log(
      `Detected: ${
        evaluation.detected
          ? "YES"
          : "NO"
      }`,
    );

    console.log(
      `Severity match: ${
        evaluation.severityMatch
          ? "YES"
          : "NO"
      }`,
    );

    console.log(
      `Specialist match: ${
        evaluation.specialistMatch
          ? "YES"
          : "NO"
      }`,
    );

    console.log(
      `Status: ${
        evaluation.passed
          ? "PASS"
          : "FAIL"
      }`,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    const providerError =
      message.toLowerCase().includes(
        "insufficient credits",
      ) ||
      message.includes(
        "402",
      ) ||
      message.toLowerCase().includes(
        "provider",
      );

    report.liveAiEvaluation.push({
      scenario: scenario.name,
      status:
        providerError
          ? "PROVIDER_ERROR"
          : "EXECUTION_ERROR",
      expectedCategory:
        scenario.expectedCategory,
      expectedSpecialist:
        scenario.expectedSpecialist,
      expectedSeverities:
        scenario.expectedSeverities,
      defect: scenario.defect,
      error: message,
    });

    console.log(
      `Status: ${
        providerError
          ? "PROVIDER_ERROR"
          : "EXECUTION_ERROR"
      }`,
    );

    console.log(
      `Reason: ${message}`,
    );
  }
}

const fixturePassCount =
  report.fixtureValidation.filter(
    (item) => item.valid,
  ).length;

const livePassCount =
  report.liveAiEvaluation.filter(
    (item) =>
      item.status === "PASS",
  ).length;

const liveFailCount =
  report.liveAiEvaluation.filter(
    (item) =>
      item.status === "FAIL",
  ).length;

const providerErrorCount =
  report.liveAiEvaluation.filter(
    (item) =>
      item.status ===
      "PROVIDER_ERROR",
  ).length;

const fixtureTotal =
  report.fixtureValidation.length;

const liveTotal =
  report.liveAiEvaluation.length;

report.summary = {
  fixturePassCount,
  fixtureTotal,
  livePassCount,
  liveFailCount,
  providerErrorCount,
  liveEvaluationAvailable:
    providerErrorCount === 0,
  liveAccuracy:
    providerErrorCount > 0
      ? null
      : liveTotal === 0
        ? null
        : Number(
            (
              livePassCount /
              liveTotal
            ).toFixed(2),
          ),
};

const outputPath =
  path.resolve(
    "evaluation",
    "evaluation-report.json",
  );

await fs.writeFile(
  outputPath,
  JSON.stringify(
    report,
    null,
    2,
  ),
  "utf8",
);

console.log(
  "\n====================================",
);

console.log(
  "EVALUATION SUMMARY",
);

console.log(
  "====================================",
);

console.log(
  `Fixture validation: ${fixturePassCount}/${fixtureTotal}`,
);

console.log(
  `Live AI PASS: ${livePassCount}/${liveTotal}`,
);

console.log(
  `Live AI FAIL: ${liveFailCount}/${liveTotal}`,
);

console.log(
  `Provider errors: ${providerErrorCount}/${liveTotal}`,
);

console.log(
  `Live accuracy: ${
    report.summary.liveAccuracy ===
    null
      ? "NOT AVAILABLE"
      : `${report.summary.liveAccuracy * 100}%`
  }`,
);

console.log(
  `Report saved to: ${outputPath}`,
);
