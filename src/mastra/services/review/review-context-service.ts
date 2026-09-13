import type {
  ChangedFile,
  CommitInfo,
} from "../repository/repository-service.js";

import {
  getCommit,
  getRepositoryInfo,
  listFiles,
  readFile,
} from "../repository/repository-service.js";

import type { ReviewInput } from "../../schemas/review-input.js";

import {
  getPullRequest,
  getPullRequestDiff,
  getPullRequestFiles,
} from "../github/github-pr-service.js";

export interface ReviewFileContext {
  path: string;
  content: string;
}

export interface ReviewContext {
  type: ReviewInput["type"];

  repositoryPath?: string;

  repositoryName?: string;

  branch?: string;

  commit?: string;

  baseRef?: string;

  targetRef?: string;

  commitInfo?: CommitInfo;

  changedFiles: ChangedFile[];

  diff: string;

  files: ReviewFileContext[];

  summary: string;
}

async function readChangedFiles(
  repositoryPath: string,
  changedFiles: ChangedFile[],
): Promise<ReviewFileContext[]> {
  const readableFiles =
    changedFiles.filter(
      (file) =>
        file.status !== "deleted" &&
        file.path.length > 0,
    );

  const files =
    await Promise.all(
      readableFiles.map(
        async (file) => {
          try {
            const content =
              await readFile(
                repositoryPath,
                file.path,
              );

            return {
              path: file.path,
              content,
            };
          } catch {
            return null;
          }
        },
      ),
    );

  return files.filter(
    (
      file,
    ): file is ReviewFileContext =>
      file !== null,
  );
}

async function buildRepositoryContext(
  repositoryPath: string,
): Promise<ReviewContext> {
  const [
    repositoryInfo,
    repositoryFiles,
  ] =
    await Promise.all([
      getRepositoryInfo(
        repositoryPath,
      ),
      listFiles(repositoryPath),
    ]);

  const files =
    await Promise.all(
      repositoryFiles.map(
        async (filePath) => ({
          path: filePath,
          content:
            await readFile(
              repositoryPath,
              filePath,
            ),
        }),
      ),
    );

  return {
    type: "repository",
    repositoryPath:
      repositoryInfo.path,
    repositoryName:
      repositoryInfo.name,
    branch:
      repositoryInfo.branch,
    commit:
      repositoryInfo.commit,
    changedFiles: [],
    diff: "",
    files,
    summary:
      `Repository review for ${repositoryInfo.name} ` +
      `on branch ${repositoryInfo.branch ?? "unknown"} ` +
      `at commit ${repositoryInfo.commit}.`,
  };
}

async function buildCommitContext(
  repositoryPath: string,
  commitRef: string,
): Promise<ReviewContext> {
  const commitInfo =
    await getCommit(
      repositoryPath,
      commitRef,
    );

  const repositoryInfo =
    await getRepositoryInfo(
      repositoryPath,
    );

  const files =
    await readChangedFiles(
      repositoryPath,
      commitInfo.changedFiles,
    );

  return {
    type: "commit",
    repositoryPath:
      repositoryInfo.path,
    repositoryName:
      repositoryInfo.name,
    branch:
      repositoryInfo.branch,
    commit:
      commitInfo.hash,
    commitInfo,
    changedFiles:
      commitInfo.changedFiles,
    diff: commitInfo.diff,
    files,
    summary:
      `Commit review for ${commitInfo.hash}: ` +
      `${commitInfo.subject}.`,
  };
}

async function buildDiffContext(
  diff: string,
): Promise<ReviewContext> {
  return {
    type: "diff",
    changedFiles: [],
    diff,
    files: [],
    summary:
      "Review the supplied Git diff and identify " +
      "correctness, security, architecture, performance, " +
      "maintainability, and testing issues.",
  };
}

async function buildPullRequestContext(
  repository: string,
  pullRequestNumber: number,
): Promise<ReviewContext> {
  const [
    pullRequest,
    pullRequestFiles,
    diff,
  ] =
    await Promise.all([
      getPullRequest(
        repository,
        pullRequestNumber,
      ),
      getPullRequestFiles(
        repository,
        pullRequestNumber,
      ),
      getPullRequestDiff(
        repository,
        pullRequestNumber,
      ),
    ]);

  const changedFiles: ChangedFile[] =
    pullRequestFiles.map(
      (file) => ({
        path: file.path,
        status: file.status,
        previousPath:
          file.previousPath,
      }),
    );

  /*
   * GitHub's pull-request files endpoint
   * provides a patch for most text-file changes.
   *
   * We expose those patches as file-level review
   * evidence so the specialists can reason about
   * individual changed files as well as the complete
   * pull-request diff.
   */
  const files: ReviewFileContext[] =
    pullRequestFiles
      .filter(
        (file) =>
          file.status !==
            "deleted" &&
          file.path.length > 0 &&
          Boolean(file.patch),
      )
      .map(
        (file) => ({
          path: file.path,
          content:
            file.patch ??
            "",
        }),
      );

  return {
    type: "pull_request",

    repositoryName:
      `${pullRequest.owner}/${pullRequest.repository}`,

    branch:
      pullRequest.headBranch,

    commit:
      pullRequest.headSha,

    baseRef:
      pullRequest.baseBranch,

    targetRef:
      pullRequest.headBranch,

    changedFiles,

    diff,

    files,

    summary:
      `Pull request #${pullRequest.number}: ` +
      `${pullRequest.title}. ` +
      `Review changes from ` +
      `${pullRequest.headBranch} into ` +
      `${pullRequest.baseBranch}.`,
  };
}

export async function buildReviewContext(
  input: ReviewInput,
): Promise<ReviewContext> {
  switch (input.type) {
    case "diff":
      return buildDiffContext(
        input.diff,
      );

    case "commit":
      return buildCommitContext(
        input.repositoryPath,
        input.commit,
      );

    case "repository":
      return buildRepositoryContext(
        input.repositoryPath,
      );

    case "pull_request":
      return buildPullRequestContext(
        input.repository,
        input.pullRequest,
      );

    default: {
      const exhaustiveCheck:
        never = input;

      return exhaustiveCheck;
    }
  }
}