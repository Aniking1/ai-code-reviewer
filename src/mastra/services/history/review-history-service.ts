import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import type { Finding } from "../../schemas/finding.js";
import type { ReviewActivity } from "../review/review-orchestrator.js";

export interface ReviewHistoryRecord {
  reviewId: string;
  createdAt: string;

  reviewType:
    | "repository"
    | "commit"
    | "diff"
    | "pull_request";

  repositoryPath?: string;
  repositoryName?: string;
  branch?: string;
  commit?: string;

  summary: string;

  recommendation:
    | "APPROVE"
    | "APPROVE WITH COMMENTS"
    | "REQUEST CHANGES"
    | "BLOCK MERGE";

  findings: Finding[];

  activity?: ReviewActivity;
}

const historyDirectory = path.resolve(
  process.cwd(),
  "workspace",
  "review-history",
);

async function ensureHistoryDirectory(): Promise<void> {
  await fs.mkdir(historyDirectory, {
    recursive: true,
  });
}

function historyFilePath(
  reviewId: string,
): string {
  return path.join(
    historyDirectory,
    `${reviewId}.json`,
  );
}

export async function saveReview(
  input: Omit<
    ReviewHistoryRecord,
    "reviewId" | "createdAt"
  >,
): Promise<ReviewHistoryRecord> {
  await ensureHistoryDirectory();

  const record: ReviewHistoryRecord = {
    ...input,
    reviewId: randomUUID(),
    createdAt: new Date().toISOString(),
  };

  await fs.writeFile(
    historyFilePath(record.reviewId),
    JSON.stringify(record, null, 2),
    "utf8",
  );

  return record;
}

export async function getReview(
  reviewId: string,
): Promise<ReviewHistoryRecord | null> {
  await ensureHistoryDirectory();

  try {
    const content = await fs.readFile(
      historyFilePath(reviewId),
      "utf8",
    );

    return JSON.parse(
      content,
    ) as ReviewHistoryRecord;
  } catch (error) {
    const code =
      error &&
      typeof error === "object" &&
      "code" in error
        ? error.code
        : undefined;

    if (code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export async function listReviews(): Promise<
  ReviewHistoryRecord[]
> {
  await ensureHistoryDirectory();

  const entries = await fs.readdir(
    historyDirectory,
    {
      withFileTypes: true,
    },
  );

  const records: ReviewHistoryRecord[] = [];

  for (const entry of entries) {
    if (
      !entry.isFile() ||
      !entry.name.endsWith(".json")
    ) {
      continue;
    }

    try {
      const content = await fs.readFile(
        path.join(
          historyDirectory,
          entry.name,
        ),
        "utf8",
      );

      records.push(
        JSON.parse(
          content,
        ) as ReviewHistoryRecord,
      );
    } catch {
      // Ignore malformed history files.
    }
  }

  return records.sort(
    (left, right) =>
      right.createdAt.localeCompare(
        left.createdAt,
      ),
  );
}

export async function deleteReview(
  reviewId: string,
): Promise<boolean> {
  try {
    await fs.unlink(
      historyFilePath(reviewId),
    );

    return true;
  } catch (error) {
    const code =
      error &&
      typeof error === "object" &&
      "code" in error
        ? error.code
        : undefined;

    if (code === "ENOENT") {
      return false;
    }

    throw error;
  }
}
