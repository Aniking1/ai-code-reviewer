
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

import {
  getChangedFiles,
  getCommit,
  getDiff,
  getRepositoryInfo,
  listFiles,
  readFile,
} from "../services/repository/repository-service.js";

const repositoryPathSchema = z
  .string()
  .min(1)
  .describe(
    "Path to the Git repository. The path must be inside workspace/repositories.",
  );

const changedFileSchema = z.object({
  path: z.string(),
  status: z.enum([
    "added",
    "modified",
    "deleted",
    "renamed",
    "copied",
    "unknown",
  ]),
  previousPath: z.string().optional(),
});

export const getRepositoryInfoTool = createTool({
  id: "get-repository-info",
  description:
    "Get metadata about a local Git repository, including its name, current branch, current commit, and whether it is a valid Git repository.",
  inputSchema: z.object({
    repositoryPath: repositoryPathSchema,
  }),
  outputSchema: z.object({
    path: z.string(),
    name: z.string(),
    branch: z.string().optional(),
    commit: z.string(),
    isGitRepository: z.boolean(),
  }),
  execute: async (inputData) => {
    return getRepositoryInfo(inputData.repositoryPath);
  },
});

export const listRepositoryFilesTool = createTool({
  id: "list-repository-files",
  description:
    "List tracked and non-ignored untracked files in a local Git repository. Use this to discover repository structure and locate files relevant to a code review.",
  inputSchema: z.object({
    repositoryPath: repositoryPathSchema,
  }),
  outputSchema: z.object({
    files: z.array(z.string()),
  }),
  execute: async (inputData) => {
    const files = await listFiles(
      inputData.repositoryPath,
    );

    return {
      files,
    };
  },
});

export const readRepositoryFileTool = createTool({
  id: "read-repository-file",
  description:
    "Read the complete contents of a specific file inside a local Git repository. Use this to inspect repository context outside the directly modified code.",
  inputSchema: z.object({
    repositoryPath: repositoryPathSchema,
    filePath: z
      .string()
      .min(1)
      .describe(
        "Repository-relative path of the file to read.",
      ),
  }),
  outputSchema: z.object({
    filePath: z.string(),
    content: z.string(),
  }),
  execute: async (inputData) => {
    const content = await readFile(
      inputData.repositoryPath,
      inputData.filePath,
    );

    return {
      filePath: inputData.filePath,
      content,
    };
  },
});

export const getChangedFilesTool = createTool({
  id: "get-changed-files",
  description:
    "Identify files changed between two Git references. Use this before reviewing a change when you need to understand which files were added, modified, deleted, renamed, or copied.",
  inputSchema: z.object({
    repositoryPath: repositoryPathSchema,
    baseRef: z
      .string()
      .min(1)
      .describe(
        "Git reference representing the base version.",
      ),
    targetRef: z
      .string()
      .min(1)
      .describe(
        "Git reference representing the version being reviewed.",
      ),
  }),
  outputSchema: z.object({
    files: z.array(changedFileSchema),
  }),
  execute: async (inputData) => {
    const files = await getChangedFiles(
      inputData.repositoryPath,
      inputData.baseRef,
      inputData.targetRef,
    );

    return {
      files,
    };
  },
});

export const getDiffTool = createTool({
  id: "get-repository-diff",
  description:
    "Retrieve the complete Git diff between two references with substantial surrounding context. Use this as the primary code-change evidence for review.",
  inputSchema: z.object({
    repositoryPath: repositoryPathSchema,
    baseRef: z
      .string()
      .min(1)
      .describe(
        "Git reference representing the base version.",
      ),
    targetRef: z
      .string()
      .min(1)
      .describe(
        "Git reference representing the version being reviewed.",
      ),
  }),
  outputSchema: z.object({
    diff: z.string(),
  }),
  execute: async (inputData) => {
    const diff = await getDiff(
      inputData.repositoryPath,
      inputData.baseRef,
      inputData.targetRef,
    );

    return {
      diff,
    };
  },
});

export const getCommitTool = createTool({
  id: "get-commit-review-context",
  description:
    "Retrieve complete review context for a specific Git commit, including commit metadata, changed files, and the commit diff. Use this when reviewing an individual commit.",
  inputSchema: z.object({
    repositoryPath: repositoryPathSchema,
    commitRef: z
      .string()
      .min(1)
      .describe(
        "Git commit reference, such as a commit SHA or HEAD.",
      ),
  }),
  outputSchema: z.object({
    hash: z.string(),
    subject: z.string(),
    author: z.string(),
    date: z.string(),
    changedFiles: z.array(changedFileSchema),
    diff: z.string(),
  }),
  execute: async (inputData) => {
    return getCommit(
      inputData.repositoryPath,
      inputData.commitRef,
    );
  },
});

export const repositoryTools = {
  getRepositoryInfoTool,
  listRepositoryFilesTool,
  readRepositoryFileTool,
  getChangedFilesTool,
  getDiffTool,
  getCommitTool,
};

