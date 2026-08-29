
import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { RepositoryInfo } from "../../schemas/repository.js";

const execFileAsync = promisify(execFile);

const WORKSPACE_ROOT = path.resolve(
  process.cwd(),
  "workspace",
  "repositories",
);

export type ChangedFileStatus =
  | "added"
  | "modified"
  | "deleted"
  | "renamed"
  | "copied"
  | "unknown";

export interface ChangedFile {
  path: string;
  status: ChangedFileStatus;
  previousPath?: string;
}

export interface CommitInfo {
  hash: string;
  subject: string;
  author: string;
  date: string;
  changedFiles: ChangedFile[];
  diff: string;
}

export async function validateRepositoryPath(
  repositoryPath: string,
): Promise<string> {
  const resolvedPath = path.resolve(repositoryPath);

  const relativePath = path.relative(
    WORKSPACE_ROOT,
    resolvedPath,
  );

  if (
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(
      "Repository path must be inside the workspace/repositories directory.",
    );
  }

  const stats = await fs.stat(resolvedPath);

  if (!stats.isDirectory()) {
    throw new Error("Repository path must be a directory.");
  }

  try {
    await execFileAsync(
      "git",
      [
        "-C",
        resolvedPath,
        "rev-parse",
        "--is-inside-work-tree",
      ],
    );
  } catch {
    throw new Error(
      "The specified directory is not a Git repository.",
    );
  }

  return resolvedPath;
}

export async function getRepositoryInfo(
  repositoryPath: string,
): Promise<RepositoryInfo> {
  const resolvedPath =
    await validateRepositoryPath(repositoryPath);

  const [{ stdout: branch }, { stdout: commit }] =
    await Promise.all([
      execFileAsync(
        "git",
        [
          "-C",
          resolvedPath,
          "branch",
          "--show-current",
        ],
      ),
      execFileAsync(
        "git",
        [
          "-C",
          resolvedPath,
          "rev-parse",
          "HEAD",
        ],
      ),
    ]);

  return {
    path: resolvedPath,
    name: path.basename(resolvedPath),
    branch: branch.trim() || undefined,
    commit: commit.trim(),
    isGitRepository: true,
  };
}

export async function listFiles(
  repositoryPath: string,
): Promise<string[]> {
  const resolvedPath =
    await validateRepositoryPath(repositoryPath);

  const { stdout } = await execFileAsync(
    "git",
    [
      "-C",
      resolvedPath,
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
    ],
  );

  return stdout
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter(Boolean)
    .sort();
}

export async function readFile(
  repositoryPath: string,
  filePath: string,
): Promise<string> {
  const resolvedRepositoryPath =
    await validateRepositoryPath(repositoryPath);

  const resolvedFilePath = path.resolve(
    resolvedRepositoryPath,
    filePath,
  );

  const relativePath = path.relative(
    resolvedRepositoryPath,
    resolvedFilePath,
  );

  if (
    relativePath.startsWith("..") ||
    path.isAbsolute(relativePath)
  ) {
    throw new Error(
      "File path must remain inside the repository.",
    );
  }

  const stats = await fs.stat(resolvedFilePath);

  if (!stats.isFile()) {
    throw new Error(
      "The specified path is not a file.",
    );
  }

  return fs.readFile(resolvedFilePath, "utf8");
}

export async function getChangedFiles(
  repositoryPath: string,
  baseRef: string,
  targetRef: string,
): Promise<ChangedFile[]> {
  const resolvedPath =
    await validateRepositoryPath(repositoryPath);

  const { stdout } = await execFileAsync(
    "git",
    [
      "-C",
      resolvedPath,
      "diff",
      "--name-status",
      "--find-renames",
      "--find-copies",
      baseRef,
      targetRef,
      "--",
    ],
  );

  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("\t");
      const statusCode = parts[0] ?? "";

      if (statusCode.startsWith("R")) {
        return {
          status: "renamed" as const,
          previousPath: parts[1],
          path: parts[2] ?? "",
        };
      }

      if (statusCode.startsWith("C")) {
        return {
          status: "copied" as const,
          previousPath: parts[1],
          path: parts[2] ?? "",
        };
      }

      const pathValue = parts[1] ?? "";

      const statusMap: Record<
        string,
        ChangedFileStatus
      > = {
        A: "added",
        M: "modified",
        D: "deleted",
      };

      return {
        path: pathValue,
        status:
          statusMap[statusCode] ?? "unknown",
      };
    });
}

export async function getDiff(
  repositoryPath: string,
  baseRef: string,
  targetRef: string,
): Promise<string> {
  const resolvedPath =
    await validateRepositoryPath(repositoryPath);

  const { stdout } = await execFileAsync(
    "git",
    [
      "-C",
      resolvedPath,
      "diff",
      "--no-ext-diff",
      "--unified=80",
      baseRef,
      targetRef,
      "--",
    ],
  );

  return stdout;
}

export async function getCommit(
  repositoryPath: string,
  commitRef: string,
): Promise<CommitInfo> {
  const resolvedPath =
    await validateRepositoryPath(repositoryPath);

  const { stdout: metadata } =
    await execFileAsync(
      "git",
      [
        "-C",
        resolvedPath,
        "show",
        "-s",
        "--format=%H%x00%s%x00%an%x00%aI",
        commitRef,
      ],
    );

  const metadataParts = metadata
    .trim()
    .split("\0");

  const hash = metadataParts[0] ?? "";
  const subject = metadataParts[1] ?? "";
  const author = metadataParts[2] ?? "";
  const date = metadataParts[3] ?? "";

  if (!hash || !subject || !author || !date) {
    throw new Error(
      "Unable to read commit metadata.",
    );
  }

  const [changedFiles, diff] =
    await Promise.all([
      getChangedFiles(
        repositoryPath,
        `${commitRef}^`,
        commitRef,
      ),
      getDiff(
        repositoryPath,
        `${commitRef}^`,
        commitRef,
      ),
    ]);

  return {
    hash,
    subject,
    author,
    date,
    changedFiles,
    diff,
  };
}

