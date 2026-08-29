import { z } from "zod";

export const repositoryInfoSchema = z.object({
  path: z.string().min(1),
  name: z.string().min(1),
  branch: z.string().optional(),
  commit: z.string().optional(),
  isGitRepository: z.boolean(),
});

export type RepositoryInfo = z.infer<typeof repositoryInfoSchema>;