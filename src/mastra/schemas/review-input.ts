import { z } from "zod";

export const reviewInputSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("diff"),
    diff: z.string().min(1),
  }),

  z.object({
    type: z.literal("commit"),
    repositoryPath: z.string().min(1),
    commit: z.string().min(1),
  }),

  z.object({
    type: z.literal("pull_request"),
    repository: z.string().min(1),
    pullRequest: z.number().int().positive(),
  }),

  z.object({
    type: z.literal("repository"),
    repositoryPath: z.string().min(1),
  }),
]);

export type ReviewInput = z.infer<
  typeof reviewInputSchema
>;