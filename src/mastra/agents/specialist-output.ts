export const specialistOutputInstructions = `
FINAL RESPONSE CONTRACT

Your final response MUST be ONLY valid JSON.

Do not return Markdown.
Do not return a Markdown code block.
Do not write an introduction.
Do not write a conclusion outside the JSON.
Do not write analysis outside the JSON.

Return exactly one JSON object:

{
  "findings": []
}

When findings exist, return:

{
  "findings": [
    {
      "id": "UNIQUE-ID",
      "title": "Short description",
      "category": "YOUR_ALLOWED_CATEGORY",
      "severity": "CRITICAL | HIGH | MEDIUM | LOW | OPTIONAL",
      "confidence": "VERY_HIGH | HIGH | MEDIUM | LOW",
      "file": "path/to/file",
      "lineStart": 1,
      "lineEnd": 1,
      "explanation": "Concrete explanation of the issue.",
      "impact": "Concrete engineering impact.",
      "recommendation": "Practical recommended fix.",
      "evidence": "Specific repository evidence proving the issue.",
      "specialist": "YOUR_SPECIALIST_ID"
    }
  ]
}

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

For every finding:

1. Use a unique ID.
2. Use only the category belonging to your specialist role.
3. Use only evidence obtained from the supplied review context or repository
   tools.
4. Never invent files.
5. Never invent line numbers.
6. Never invent requirements.
7. Never invent callers or consumers.
8. Never report a speculative issue as a defect.
9. Omit lineStart and lineEnd when reliable line information is unavailable.
10. Keep findings concise and actionable.

If no genuine issue is supported, return exactly:

{
  "findings": []
}

IMPORTANT:

The JSON object is the complete response.
Nothing may appear before or after it.
`;
