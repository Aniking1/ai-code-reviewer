import assert from "node:assert/strict";
import test from "node:test";

import {
  runSupervisorOrchestration,
} from "../supervisor-orchestrator.js";

const securityFinding = {
  id: "SECURITY-001",
  title: "Command injection through user input",
  category: "SECURITY",
  severity: "HIGH",
  confidence: "VERY_HIGH",
  file: "handler.ts",
  lineStart: 2,
  lineEnd: 2,
  explanation:
    "Untrusted request input reaches a shell command.",
  impact:
    "An attacker may execute arbitrary commands.",
  recommendation:
    "Avoid passing untrusted input to a shell.",
  evidence:
    "req.body.command reaches exec(userInput).",
  specialist: "security",
};

const duplicateSecurityFinding = {
  id: "SECURITY-002",
  title: "Command injection through user input",
  category: "SECURITY",
  severity: "HIGH",
  confidence: "HIGH",
  file: "handler.ts",
  lineStart: 2,
  lineEnd: 2,
  explanation:
    "User input reaches exec().",
  impact:
    "Potential arbitrary command execution.",
  recommendation:
    "Validate or constrain command execution.",
  evidence:
    "req.body.command reaches exec(userInput).",
  specialist: "security",
};

const testingFinding = {
  id: "TESTING-001",
  title: "Missing regression test",
  category: "TESTING",
  severity: "MEDIUM",
  confidence: "HIGH",
  file: "handler.ts",
  lineStart: 2,
  lineEnd: 2,
  explanation:
    "The security-sensitive execution path lacks a regression test.",
  impact:
    "Future regressions may go undetected.",
  recommendation:
    "Add a regression test for the security-sensitive path.",
  evidence:
    "No test covers the command execution path.",
  specialist: "testing",
};

test("runs complete local supervisor orchestration", () => {
  const result = runSupervisorOrchestration({
    specialistResponses: [
      {
        specialist: "security",
        text: JSON.stringify({
          findings: [
            securityFinding,
            duplicateSecurityFinding,
          ],
        }),
      },
      {
        specialist: "testing",
        text: JSON.stringify({
          findings: [testingFinding],
        }),
      },
    ],
  });

  assert.equal(result.specialistCount, 2);
  assert.equal(result.parsedFindingCount, 3);

  assert.equal(
    result.findings.length,
    2,
  );

  assert.equal(
    result.recommendation,
    "REQUEST CHANGES",
  );

  assert.equal(
    result.findings[0].id,
    "SECURITY-001",
  );

  assert.equal(
    result.findings[0].severity,
    "HIGH",
  );

  assert.equal(
    result.findings[1].id,
    "TESTING-001",
  );
});

test("ignores malformed specialist output", () => {
  const result = runSupervisorOrchestration({
    specialistResponses: [
      {
        specialist: "security",
        text: "I found a serious security issue.",
      },
      {
        specialist: "testing",
        text: "",
      },
    ],
  });

  assert.equal(result.specialistCount, 2);
  assert.equal(result.parsedFindingCount, 0);
  assert.equal(result.findings.length, 0);
  assert.equal(
    result.recommendation,
    "APPROVE",
  );
});

test("supports an approval result when no findings exist", () => {
  const result = runSupervisorOrchestration({
    specialistResponses: [
      {
        specialist: "correctness",
        text: JSON.stringify({
          findings: [],
        }),
      },
      {
        specialist: "security",
        text: JSON.stringify({
          findings: [],
        }),
      },
    ],
  });

  assert.equal(result.specialistCount, 2);
  assert.equal(result.parsedFindingCount, 0);
  assert.equal(result.findings.length, 0);
  assert.equal(
    result.recommendation,
    "APPROVE",
  );
});
