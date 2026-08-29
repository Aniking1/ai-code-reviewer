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

export async function validateRepositoryPath(
  repositoryPath: string,
): Promise<string> {
  const resolvedPath = path.resolve(repositoryPath);

  const relativePath = path.relative(WORKSPACE_ROOT, resolvedPath);

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
      ["-C", resolvedPath, "rev-parse", "--is-inside-work-tree"],
    );
  } catch {
    throw new Error("The specified directory is not a Git repository.");
  }

  return resolvedPath;
}

export async function getRepositoryInfo(
  repositoryPath: string,
): Promise<RepositoryInfo> {
  const resolvedPath = await validateRepositoryPath(repositoryPath);

  const [{ stdout: branch }, { stdout: commit }] = await Promise.all([
    execFileAsync(
      "git",
      ["-C", resolvedPath, "branch", "--show-current"],
    ),
    execFileAsync(
      "git",
      ["-C", resolvedPath, "rev-parse", "HEAD"],
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
  const resolvedPath = await validateRepositoryPath(repositoryPath);

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
    throw new Error("The specified path is not a file.");
  }

  return fs.readFile(resolvedFilePath, "utf8");
}