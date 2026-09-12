import assert from "node:assert/strict";
import test from "node:test";

import {
  collectSpecialistFindings,
} from "../specialist-findings.js";

test("collects structured findings from specialist responses", () => {
  const responses = [
    {
      specialist: "security",
      text: JSON.stringify({
        findings: [
          {
            id: "SECURITY-001",
            title: "Command injection",
            category: "SECURITY",
            severity: "HIGH",
            confidence: "VERY_HIGH",
            file: "handler.ts",
            lineStart: 2,
            lineEnd: 2,
            explanation: "Untrusted input reaches a shell command.",
            impact: "Arbitrary command execution is possible.",
            recommendation: "Avoid passing untrusted input to a shell.",
            evidence: "req.body.command reaches exec().",
            specialist: "security",
          },
        ],
      }),
    },
    {
      specialist: "testing",
      text: JSON.stringify({
        findings: [
          {
            id: "TESTING-001",
            title: "Missing regression test",
            category: "TESTING",
            severity: "MEDIUM",
            confidence: "HIGH",
            file: "handler.ts",
            lineStart: 2,
            lineEnd: 2,
            explanation: "The security-sensitive path lacks a regression test.",
            impact: "Future regressions may go undetected.",
            recommendation: "Add a regression test.",
            evidence: "No test covers the command path.",
            specialist: "testing",
          },
        ],
      }),
    },
  ];

  const findings =
    collectSpecialistFindings(responses);

  assert.equal(findings.length, 2);
  assert.equal(findings[0].category, "SECURITY");
  assert.equal(findings[1].category, "TESTING");
});

test("ignores empty specialist responses", () => {
  const findings = collectSpecialistFindings([
    {
      specialist: "testing",
      text: "",
    },
  ]);

  assert.deepEqual(findings, []);
});

test("ignores malformed specialist responses", () => {
  const findings = collectSpecialistFindings([
    {
      specialist: "security",
      text: "I found a possible issue.",
    },
  ]);

  assert.deepEqual(findings, []);
});
