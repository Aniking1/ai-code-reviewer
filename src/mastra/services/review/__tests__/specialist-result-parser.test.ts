import assert from "node:assert/strict";
import test from "node:test";

import {
  parseSpecialistResult,
} from "../specialist-result-parser.js";

const validFinding = {
  id: "SECURITY-001",
  title: "Command injection",
  category: "SECURITY",
  severity: "HIGH",
  confidence: "VERY_HIGH",
  file: "handler.ts",
  lineStart: 2,
  lineEnd: 2,
  explanation: "User input reaches a shell command.",
  impact: "An attacker may execute arbitrary commands.",
  recommendation: "Avoid passing untrusted input to a shell.",
  evidence: "req.body.command reaches exec(userInput).",
  specialist: "security",
};

test("parses a structured findings object", () => {
  const result = parseSpecialistResult(
    JSON.stringify({
      findings: [validFinding],
    }),
  );

  assert.equal(result.wasJson, true);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0].id, "SECURITY-001");
});

test("parses findings wrapped in a markdown code block", () => {
  const result = parseSpecialistResult(`
Here is the review:

\`\`\`json
${JSON.stringify({
  findings: [validFinding],
})}
\`\`\`
`);

  assert.equal(result.wasJson, true);
  assert.equal(result.findings.length, 1);
});

test("parses a bare findings array", () => {
  const result = parseSpecialistResult(
    JSON.stringify([validFinding]),
  );

  assert.equal(result.wasJson, true);
  assert.equal(result.findings.length, 1);
});

test("returns empty findings for empty findings", () => {
  const result = parseSpecialistResult(
    '{"findings":[]}',
  );

  assert.equal(result.wasJson, true);
  assert.deepEqual(result.findings, []);
});

test("ignores invalid findings", () => {
  const result = parseSpecialistResult(
    JSON.stringify({
      findings: [
        {
          id: "BAD-001",
          title: "Invalid",
          category: "NOT_A_REAL_CATEGORY",
          severity: "HIGH",
          confidence: "HIGH",
          explanation: "invalid",
          impact: "invalid",
          recommendation: "invalid",
          evidence: "invalid",
          specialist: "security",
        },
      ],
    }),
  );

  assert.equal(result.wasJson, true);
  assert.deepEqual(result.findings, []);
});

test("handles empty specialist output", () => {
  const result = parseSpecialistResult("");

  assert.equal(result.wasJson, false);
  assert.deepEqual(result.findings, []);
});

test("handles non-JSON specialist prose", () => {
  const result = parseSpecialistResult(
    "No meaningful issues were identified.",
  );

  assert.equal(result.wasJson, false);
  assert.deepEqual(result.findings, []);
});
