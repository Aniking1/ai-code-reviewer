"use client";

import { useEffect, useMemo, useState } from "react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:4111";

type ReviewMode =
  | "repository"
  | "commit"
  | "diff";

type SpecialistActivity = {
  id: string;
  label: string;
  description: string;
  status:
    | "selected"
    | "not_selected";
};

type Finding = {
  id: string;
  title: string;
  category: string;
  severity: string;
  confidence: string;
  file: string;
  lineStart?: number;
  lineEnd?: number;
  explanation: string;
  impact: string;
  recommendation: string;
  evidence?: string;
  specialist?: string;
};

type ReviewResult = {
  recommendation:
    | "APPROVE"
    | "APPROVE WITH COMMENTS"
    | "REQUEST CHANGES"
    | "BLOCK MERGE";
  summary: string;
  findings: Finding[];
  activity?: {
    supervisor: "completed";
    specialists: SpecialistActivity[];
  };
};

type ReviewContext = {
  type: string;
  repositoryPath?: string;
  repositoryName?: string;
  branch?: string;
  commit?: string;
};

type ReviewResponse = {
  review: ReviewResult;
  context: ReviewContext;
};

type HistoryRecord = {
  reviewId: string;
  createdAt: string;
  reviewType: string;
  repositoryPath?: string;
  repositoryName?: string;
  branch?: string;
  commit?: string;
  summary: string;
  recommendation: string;
  findings: Finding[];
  activity?: {
    supervisor: "completed";
    specialists: Array<{
      id: string;
      label: string;
      description: string;
      status:
        | "selected"
        | "not_selected";
    }>;
  };
};

const specialists = [
  {
    id: "correctness",
    label: "Correctness",
    description: "Logic and behavior",
  },
  {
    id: "security",
    label: "Security",
    description: "Security vulnerabilities",
  },
  {
    id: "architecture",
    label: "Architecture",
    description: "Design and coupling",
  },
  {
    id: "performance",
    label: "Performance",
    description: "Performance and scale",
  },
  {
    id: "maintainability",
    label: "Maintainability",
    description: "Code quality",
  },
  {
    id: "testing",
    label: "Testing",
    description: "Tests and coverage",
  },
] as const;

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function recommendationClass(
  recommendation: string,
) {
  switch (recommendation) {
    case "APPROVE":
      return "bg-emerald-100 text-emerald-700";
    case "APPROVE WITH COMMENTS":
      return "bg-amber-100 text-amber-700";
    case "REQUEST CHANGES":
      return "bg-orange-100 text-orange-700";
    case "BLOCK MERGE":
      return "bg-red-100 text-red-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function Home() {
  const [mode, setMode] =
    useState<ReviewMode>("repository");

  const [repositoryPath, setRepositoryPath] =
    useState(
      "./workspace/repositories/sample-repo",
    );

  const [commit, setCommit] =
    useState("HEAD");

  const [diff, setDiff] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [result, setResult] =
    useState<ReviewResponse | null>(null);

  const [history, setHistory] =
    useState<HistoryRecord[]>([]);

  const [historyLoading, setHistoryLoading] =
    useState(false);

  const [detail, setDetail] =
    useState<HistoryRecord | null>(null);

  const [detailLoading, setDetailLoading] =
    useState(false);

  const [detailError, setDetailError] =
    useState("");

  const [severityFilter, setSeverityFilter] =
    useState("ALL");

  const [categoryFilter, setCategoryFilter] =
    useState("ALL");

  const [fileFilter, setFileFilter] =
    useState("ALL");

  async function loadHistory() {
    setHistoryLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/reviews`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load review history (${response.status}).`,
        );
      }

      const payload = await response.json();

      setHistory(
        Array.isArray(payload.reviews)
          ? payload.reviews
          : [],
      );
    } catch (error) {
      console.error(
        "History loading failed:",
        error,
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    void loadHistory();
  }, []);

  async function openHistory(
    reviewId: string,
  ) {
    setDetail(null);
    setDetailError("");
    setDetailLoading(true);

    try {
      const response = await fetch(
        `${API_BASE}/reviews/${reviewId}`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load review details (${response.status}).`,
        );
      }

      const payload =
        await response.json();

      const historyReview =
        payload.review ?? payload;

      setDetail(historyReview);
    } catch (error) {
      setDetailError(
        error instanceof Error
          ? error.message
          : "Unable to load review details.",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function startReview() {
    setLoading(true);
    setError("");
    setResult(null);

    setSeverityFilter("ALL");
    setCategoryFilter("ALL");
    setFileFilter("ALL");

    let body;

    if (mode === "repository") {
      body = {
        type: "repository",
        repositoryPath,
      };
    } else if (mode === "commit") {
      body = {
        type: "commit",
        repositoryPath,
        commit,
      };
    } else {
      body = {
        type: "diff",
        diff,
      };
    }

    try {
      const response = await fetch(
        `${API_BASE}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      const payload =
        await response.json();

      if (!response.ok) {
        if (
          response.status === 503 &&
          payload.code ===
            "AI_PROVIDER_UNAVAILABLE"
        ) {
          throw new Error(
            "AI provider unavailable. " +
              "The configured OpenRouter account " +
              "does not currently have sufficient credits. " +
              "Previously completed reviews and review history remain available.",
          );
        }

        throw new Error(
          payload.error ??
            `Review failed (${response.status}).`,
        );
      }

      setResult(payload);
      await loadHistory();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to complete the review.",
      );
    } finally {
      setLoading(false);
    }
  }

  const findings =
    result?.review.findings ?? [];

  const filteredFindings =
    useMemo(() => {
      return findings.filter(
        (finding) =>
          (severityFilter === "ALL" ||
            finding.severity ===
              severityFilter) &&
          (categoryFilter === "ALL" ||
            finding.category ===
              categoryFilter) &&
          (fileFilter === "ALL" ||
            finding.file === fileFilter),
      );
    }, [
      findings,
      severityFilter,
      categoryFilter,
      fileFilter,
    ]);

  const files =
    [...new Set(
      findings.map(
        (finding) => finding.file,
      ),
    )].sort();

  const activity =
    result?.review.activity
      ?.specialists ?? [];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-8">
          <p className="text-sm font-semibold tracking-[0.18em] text-blue-600">
            AGENTIC ENGINEERING REVIEW
          </p>

          <h1 className="mt-2 text-4xl font-bold tracking-tight">
            AI Code Reviewer
          </h1>

          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Multi-agent code review with
            selective specialist delegation,
            consolidation, and persistent
            review history.
          </p>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">
              Start a review
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Choose the review source.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2">
              {(
                [
                  ["repository", "Repository"],
                  ["commit", "Commit"],
                  ["diff", "Git Diff"],
                ] as const
              ).map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setMode(value)
                    }
                    className={`rounded-xl border px-3 py-3 text-sm font-medium ${
                      mode === value
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>

            <div className="mt-5 space-y-4">
              {mode !== "diff" && (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">
                    Repository path
                  </span>

                  <input
                    value={repositoryPath}
                    onChange={(event) =>
                      setRepositoryPath(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />
                </label>
              )}

              {mode === "commit" && (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">
                    Commit
                  </span>

                  <input
                    value={commit}
                    onChange={(event) =>
                      setCommit(
                        event.target.value,
                      )
                    }
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />
                </label>
              )}

              {mode === "diff" && (
                <label className="block">
                  <span className="mb-2 block text-sm font-medium">
                    Git diff
                  </span>

                  <textarea
                    value={diff}
                    onChange={(event) =>
                      setDiff(
                        event.target.value,
                      )
                    }
                    rows={10}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-xs outline-none focus:border-blue-500"
                  />
                </label>
              )}

              <button
                type="button"
                onClick={() =>
                  void startReview()
                }
                disabled={loading}
                className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {loading
                  ? "Running Code Review..."
                  : "Start Code Review"}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold">
                  Review activity
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Shows which specialists
                  the Supervisor actually
                  selected.
                </p>
              </div>

              {result && (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  {
                    activity.filter(
                      (item) =>
                        item.status ===
                        "selected",
                    ).length
                  }{" "}
                  selected
                </span>
              )}
            </div>

            <div className="mt-5">
              <ActivityRow
                label="Supervisor"
                description="Coordinates the review and delegates work"
                status={
                  result
                    ? "completed"
                    : "waiting"
                }
              />

              <div className="my-3 border-l-2 border-slate-200 pl-4">
                {specialists.map(
                  (specialist) => {
                    const actual =
                      activity.find(
                        (item) =>
                          item.id ===
                          specialist.id,
                      );

                    const status =
                      loading
                        ? "waiting"
                        : actual?.status ??
                          "not_selected";

                    return (
                      <ActivityRow
                        key={
                          specialist.id
                        }
                        label={
                          specialist.label
                        }
                        description={
                          specialist.description
                        }
                        status={
                          status
                        }
                      />
                    );
                  },
                )}
              </div>
            </div>
          </section>
        </div>

        {result && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Consolidated review
                </p>

                <h2 className="mt-1 text-2xl font-bold">
                  {result.context.repositoryName ??
                    "Code Review"}
                </h2>
              </div>

              <span
                className={`rounded-full px-4 py-2 text-sm font-semibold ${recommendationClass(
                  result.review
                    .recommendation,
                )}`}
              >
                {
                  result.review
                    .recommendation
                }
              </span>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <Stat
                label="Findings"
                value={String(
                  findings.length,
                )}
              />

              <Stat
                label="Review type"
                value={result.context.type}
              />

              <Stat
                label="Branch"
                value={
                  result.context.branch ??
                  "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â"
                }
              />
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              {result.review.summary}
            </div>

            {findings.length > 0 && (
              <>
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <select
                    value={severityFilter}
                    onChange={(event) =>
                      setSeverityFilter(
                        event.target.value,
                      )
                    }
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="ALL">
                      Severity: ALL
                    </option>
                    {[
                      "CRITICAL",
                      "HIGH",
                      "MEDIUM",
                      "LOW",
                      "OPTIONAL",
                    ].map(
                      (value) => (
                        <option
                          key={value}
                          value={value}
                        >
                          Severity:{" "}
                          {value}
                        </option>
                      ),
                    )}
                  </select>

                  <select
                    value={categoryFilter}
                    onChange={(event) =>
                      setCategoryFilter(
                        event.target.value,
                      )
                    }
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="ALL">
                      Category: ALL
                    </option>

                    {[
                      ...new Set(
                        findings.map(
                          (finding) =>
                            finding.category,
                        ),
                      ),
                    ].map(
                      (value) => (
                        <option
                          key={value}
                          value={value}
                        >
                          Category:{" "}
                          {value}
                        </option>
                      ),
                    )}
                  </select>

                  <select
                    value={fileFilter}
                    onChange={(event) =>
                      setFileFilter(
                        event.target.value,
                      )
                    }
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="ALL">
                      File: ALL
                    </option>

                    {files.map(
                      (file) => (
                        <option
                          key={file}
                          value={file}
                        >
                          File: {file}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="mt-5 space-y-4">
                  {filteredFindings.map(
                    (finding) => (
                      <FindingCard
                        key={finding.id}
                        finding={finding}
                      />
                    ),
                  )}
                </div>
              </>
            )}
          </section>
        )}

        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                Review history
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Select a previous review to
                inspect its full result.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadHistory()
              }
              disabled={historyLoading}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
            >
              {historyLoading
                ? "Refreshing..."
                : "Refresh"}
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {history.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                No saved reviews.
              </div>
            ) : (
              history.map(
                (record) => (
                  <button
                    key={
                      record.reviewId
                    }
                    type="button"
                    onClick={() =>
                      void openHistory(
                        record.reviewId,
                      )
                    }
                    className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-4 text-left hover:border-blue-300 hover:bg-blue-50/30"
                  >
                    <div>
                      <p className="font-semibold">
                        {record.repositoryName ??
                          "Review"}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {record.reviewType}{" "}
                        Ãƒâ€šÃ‚Â·{" "}
                        {formatDate(
                          record.createdAt,
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${recommendationClass(
                          record.recommendation,
                        )}`}
                      >
                        {
                          record.recommendation
                        }
                      </span>

                      <span className="text-slate-400">
                        ?
                      </span>
                    </div>
                  </button>
                ),
              )
            )}
          </div>
        </section>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Review details
                </p>

                <h2 className="mt-1 text-xl font-bold">
                  {detail.repositoryName ??
                    "Review"}
                </h2>
              </div>

              <button
                type="button"
                onClick={() =>
                  setDetail(null)
                }
                className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-100"
              >
                Close
              </button>
            </div>

            <div className="p-6">
              {detailLoading && (
                <p className="text-sm text-slate-500">
                  Loading review...
                </p>
              )}

              {detailError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {detailError}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                <Stat
                  label="Recommendation"
                  value={
                    detail.recommendation
                  }
                />

                <Stat
                  label="Findings"
                  value={String(
                    detail.findings.length,
                  )}
                />

                <Stat
                  label="Review type"
                  value={detail.reviewType}
                />
              </div>

              <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
                {detail.summary}
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Specialist activity
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Supervisor delegation recorded for this review.
                    </p>
                  </div>

                  {detail.activity && (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                      {
                        detail.activity.specialists.filter(
                          (specialist) =>
                            specialist.status ===
                            "selected",
                        ).length
                      }{" "}
                      selected
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">
                        Supervisor
                      </p>

                      <p className="text-xs text-slate-500">
                        Coordinates the review
                      </p>
                    </div>

                    <span className="text-xs font-semibold text-blue-700">
                      {detail.activity?.supervisor ===
                      "completed"
                        ? "Complete"
                        : "Not recorded"}
                    </span>
                  </div>

                  {(
                    detail.activity?.specialists ??
                    specialists.map((specialist) => ({
                      ...specialist,
                      status:
                        "not_selected" as const,
                    }))
                  ).map(
                    (specialist) => (
                      <div
                        key={specialist.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold">
                            {specialist.label}
                          </p>

                          <p className="text-xs text-slate-500">
                            {specialist.description}
                          </p>
                        </div>

                        <span
                          className={`text-xs font-semibold ${
                            specialist.status ===
                            "selected"
                              ? "text-blue-700"
                              : "text-slate-400"
                          }`}
                        >
                          {specialist.status ===
                          "selected"
                            ? "Selected"
                            : "Not selected"}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-semibold">
                  Findings
                </h3>

                {detail.findings.length ===
                0 ? (
                  <div className="mt-3 rounded-xl border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
                    No findings were recorded.
                  </div>
                ) : (
                  <div className="mt-4 space-y-4">
                    {detail.findings.map(
                      (finding) => (
                        <FindingCard
                          key={finding.id}
                          finding={finding}
                        />
                      ),
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {detailLoading && !detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="rounded-2xl bg-white px-6 py-5 shadow-xl">
            <p className="text-sm text-slate-600">
              Loading review details...
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

function ActivityRow({
  label,
  description,
  status,
}: {
  label: string;
  description: string;
  status:
    | "selected"
    | "not_selected"
    | "completed"
    | "waiting";
}) {
  const active =
    status === "selected" ||
    status === "completed";

  return (
    <div className="mb-2 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 last:mb-0">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
            active
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-400"
          }`}
        >
          {status === "not_selected"
            ? "ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â"
            : status === "waiting"
              ? "ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¢"
              : "?"}
        </div>

        <div>
          <p className="text-sm font-semibold">
            {label}
          </p>

          <p className="text-xs text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <span className="text-xs font-medium text-slate-500">
        {status === "selected"
          ? "Selected"
          : status === "not_selected"
            ? "Not selected"
            : status === "completed"
              ? "Complete"
              : "Waiting"}
      </span>
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold">
        {value}
      </p>
    </div>
  );
}

function FindingCard({
  finding,
}: {
  finding: Finding;
}) {
  return (
    <article className="rounded-xl border border-slate-200 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {finding.category}
          </p>

          <h3 className="mt-1 font-semibold">
            {finding.title}
          </h3>
        </div>

        <div className="flex gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">
            {finding.severity}
          </span>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
            {finding.confidence}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            File
          </p>

          <p className="mt-1 break-all font-mono text-xs">
            {finding.file}
            {finding.lineStart !==
              undefined &&
              `:${finding.lineStart}`}
            {finding.lineEnd !==
              undefined &&
              finding.lineEnd !==
                finding.lineStart &&
              `-${finding.lineEnd}`}
          </p>
        </div>

        {finding.specialist && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Specialist
            </p>

            <p className="mt-1 text-xs font-medium">
              {finding.specialist}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3 text-sm text-slate-600">
        <p>
          <strong className="text-slate-800">
            Explanation:
          </strong>{" "}
          {finding.explanation}
        </p>

        <p>
          <strong className="text-slate-800">
            Impact:
          </strong>{" "}
          {finding.impact}
        </p>

        <p>
          <strong className="text-slate-800">
            Recommendation:
          </strong>{" "}
          {finding.recommendation}
        </p>

        {finding.evidence && (
          <p>
            <strong className="text-slate-800">
              Evidence:
            </strong>{" "}
            {finding.evidence}
          </p>
        )}
      </div>
    </article>
  );
}
