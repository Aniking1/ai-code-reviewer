export interface GitHubPullRequest {
  owner: string;
  repository: string;
  number: number;
  title: string;
  body: string | null;
  baseBranch: string;
  headBranch: string;
  baseSha: string;
  headSha: string;
  htmlUrl: string;
}

export type GitHubPullRequestFileStatus =
  | "added"
  | "modified"
  | "deleted"
  | "renamed"
  | "copied"
  | "unknown";

export interface GitHubPullRequestFile {
  path: string;
  status: GitHubPullRequestFileStatus;
  additions: number;
  deletions: number;
  changes: number;
  previousPath?: string;
  patch?: string;
}

interface GitHubPullResponse {
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  base: {
    ref: string;
    sha: string;
  };
  head: {
    ref: string;
    sha: string;
  };
}

interface GitHubFileResponse {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  previous_filename?: string;
  patch?: string;
}

function parseRepository(
  repository: string,
): {
  owner: string;
  name: string;
} {
  const normalized =
    repository
      .trim()
      .replace(
        /^https?:\/\/github\.com\//i,
        "",
      )
      .replace(/\/+$/, "")
      .replace(/\.git$/i, "");

  const parts =
    normalized.split("/");

  if (
    parts.length !== 2 ||
    !parts[0] ||
    !parts[1]
  ) {
    throw new Error(
      "GitHub repository must use owner/repository format or a GitHub repository URL.",
    );
  }

  return {
    owner: parts[0],
    name: parts[1],
  };
}

function normalizeFileStatus(
  status: string,
): GitHubPullRequestFileStatus {
  switch (status) {
    case "added":
      return "added";

    case "modified":
      return "modified";

    case "deleted":
      return "deleted";

    case "renamed":
      return "renamed";

    case "copied":
      return "copied";

    default:
      return "unknown";
  }
}

function getHeaders(
  accept: string,
): HeadersInit {
  const token =
    process.env.GITHUB_TOKEN;

  return {
    Accept: accept,

    ...(token
      ? {
          Authorization:
            `Bearer ${token}`,
        }
      : {}),

    "X-GitHub-Api-Version":
      "2026-03-10",

    "User-Agent":
      "AI-Code-Reviewer",
  };
}

async function requestJson<T>(
  url: string,
): Promise<T> {
  const response =
    await fetch(url, {
      headers:
        getHeaders(
          "application/vnd.github+json",
        ),
    });

  if (!response.ok) {
    const body =
      await response.text();

    throw new Error(
      `GitHub API request failed (${response.status}): ${body}`,
    );
  }

  return response.json() as Promise<T>;
}

async function requestText(
  url: string,
  accept: string,
): Promise<string> {
  const response =
    await fetch(url, {
      headers:
        getHeaders(accept),
    });

  if (!response.ok) {
    const body =
      await response.text();

    throw new Error(
      `GitHub API request failed (${response.status}): ${body}`,
    );
  }

  return response.text();
}

export async function getPullRequest(
  repository: string,
  pullRequest: number,
): Promise<GitHubPullRequest> {
  const {
    owner,
    name,
  } = parseRepository(
    repository,
  );

  const data =
    await requestJson<GitHubPullResponse>(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pulls/${pullRequest}`,
    );

  return {
    owner,
    repository: name,
    number: data.number,
    title: data.title,
    body: data.body,
    baseBranch: data.base.ref,
    headBranch: data.head.ref,
    baseSha: data.base.sha,
    headSha: data.head.sha,
    htmlUrl: data.html_url,
  };
}

export async function getPullRequestFiles(
  repository: string,
  pullRequest: number,
): Promise<GitHubPullRequestFile[]> {
  const {
    owner,
    name,
  } = parseRepository(
    repository,
  );

  const files:
    GitHubPullRequestFile[] = [];

  for (
    let page = 1;
    page <= 30;
    page += 1
  ) {
    const data =
      await requestJson<
        GitHubFileResponse[]
      >(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pulls/${pullRequest}/files?per_page=100&page=${page}`,
      );

    files.push(
      ...data.map(
        (
          file,
        ): GitHubPullRequestFile => ({
          path:
            file.filename,

          status:
            normalizeFileStatus(
              file.status,
            ),

          additions:
            file.additions,

          deletions:
            file.deletions,

          changes:
            file.changes,

          previousPath:
            file.previous_filename,

          patch:
            file.patch,
        }),
      ),
    );

    if (
      data.length < 100
    ) {
      break;
    }
  }

  return files;
}

export async function getPullRequestDiff(
  repository: string,
  pullRequest: number,
): Promise<string> {
  const {
    owner,
    name,
  } = parseRepository(
    repository,
  );

  return requestText(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/pulls/${pullRequest}`,
    "application/vnd.github.diff",
  );
}