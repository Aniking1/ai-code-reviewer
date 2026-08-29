import { z } from "zod";

export const severitySchema = z.enum([
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "OPTIONAL",
]);

export const confidenceSchema = z.enum([
  "VERY_HIGH",
  "HIGH",
  "MEDIUM",
  "LOW",
]);

export const findingCategorySchema = z.enum([
  "CORRECTNESS",
  "SECURITY",
  "ARCHITECTURE",
  "PERFORMANCE",
  "MAINTAINABILITY",
  "TESTING",
]);

export const findingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  category: findingCategorySchema,
  severity: severitySchema,
  confidence: confidenceSchema,

  file: z.string().optional(),
  lineStart: z.number().int().positive().optional(),
  lineEnd: z.number().int().positive().optional(),

  explanation: z.string().min(1),
  impact: z.string().min(1),
  recommendation: z.string().optional(),

  evidence: z.string().optional(),

  specialist: z.string().min(1),
});

export type Finding = z.infer<typeof findingSchema>;