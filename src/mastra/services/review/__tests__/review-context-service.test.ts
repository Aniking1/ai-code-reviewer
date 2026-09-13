import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReviewContext,
} from "../review-context-service.js";

test(
  "builds context from a diff",
  async () => {
    const result =
      await buildReviewContext({
        type: "diff",
        diff:
          "diff --git a/hello.ts b/hello.ts\n" +
          "--- a/hello.ts\n" +
          "+++ b/hello.ts\n" +
          "@@ -1 +1 @@\n" +
          "-old\n" +
          "+new\n",
      });

    assert.equal(
      result.type,
      "diff",
    );

    assert.equal(
      result.diff.includes("+new"),
      true,
    );

    assert.deepEqual(
      result.changedFiles,
      [],
    );

    assert.deepEqual(
      result.files,
      [],
    );
  },
);

test(
  "builds context from a commit",
  async () => {
    const result =
      await buildReviewContext({
        type: "commit",
        repositoryPath:
          "./workspace/repositories/sample-repo",
        commit:
          "HEAD",
      });

    assert.equal(
      result.type,
      "commit",
    );

    assert.equal(
      result.repositoryName,
      "sample-repo",
    );

    assert.equal(
      result.branch,
      "main",
    );

    assert.match(
      result.diff,
      /\+export function hello\(name: string\)/,
    );

    assert.equal(
      result.changedFiles.length,
      1,
    );

    assert.equal(
      result.changedFiles[0]?.path,
      "hello.ts",
    );
  },
);

test(
  "builds context from a repository",
  async () => {
    const result =
      await buildReviewContext({
        type: "repository",
        repositoryPath:
          "./workspace/repositories/sample-repo",
      });

    assert.equal(
      result.type,
      "repository",
    );

    assert.equal(
      result.repositoryName,
      "sample-repo",
    );

    assert.equal(
      result.branch,
      "main",
    );

    assert.ok(
      result.commit,
    );

    assert.equal(
      result.changedFiles.length,
      0,
    );

    assert.equal(
      result.diff,
      "",
    );

    assert.ok(
      result.files.some(
        (file) =>
          file.path ===
          "hello.ts",
      ),
    );
  },
);

test(
  "builds pull request context from GitHub",
  async () => {
    const originalFetch =
      globalThis.fetch;

    globalThis.fetch =
      async (
        input: RequestInfo | URL,
        init?: RequestInit,
      ): Promise<Response> => {
        const url =
          String(input);

        const accept =
          new Headers(
            init?.headers,
          ).get("Accept");

        /*
         * Pull request diff request.
         */
        if (
          url.includes(
            "/pulls/1",
          ) &&
          accept ===
            "application/vnd.github.diff"
        ) {
          return new Response(
            [
              "diff --git a/src/example.ts b/src/example.ts",
              "--- a/src/example.ts",
              "+++ b/src/example.ts",
              "@@ -1 +1 @@",
              "-const value = 1;",
              "+const value = 2;",
            ].join("\n"),
            {
              status: 200,
              headers: {
                "Content-Type":
                  "text/plain",
              },
            },
          );
        }

        /*
         * Pull request changed-files request.
         */
        if (
          url.includes(
            "/pulls/1/files",
          )
        ) {
          return new Response(
            JSON.stringify([
              {
                filename:
                  "src/example.ts",
                status:
                  "modified",
                additions: 1,
                deletions: 1,
                changes: 2,
                patch:
                  "@@ -1 +1 @@\n" +
                  "-const value = 1;\n" +
                  "+const value = 2;",
              },
            ]),
            {
              status: 200,
              headers: {
                "Content-Type":
                  "application/json",
              },
            },
          );
        }

        /*
         * Pull request metadata request.
         */
        if (
          url.includes(
            "/pulls/1",
          )
        ) {
          return new Response(
            JSON.stringify({
              number: 1,
              title:
                "Update example",
              body:
                "Test pull request",
              html_url:
                "https://github.com/example/repo/pull/1",
              base: {
                ref: "main",
                sha: "base-sha",
              },
              head: {
                ref: "feature",
                sha: "head-sha",
              },
            }),
            {
              status: 200,
              headers: {
                "Content-Type":
                  "application/json",
              },
            },
          );
        }

        return new Response(
          JSON.stringify({
            message:
              "Not Found",
          }),
          {
            status: 404,
            headers: {
              "Content-Type":
                "application/json",
            },
          },
        );
      };

    try {
      const result =
        await buildReviewContext({
          type: "pull_request",
          repository:
            "example/repo",
          pullRequest: 1,
        });

      assert.equal(
        result.type,
        "pull_request",
      );

      assert.equal(
        result.repositoryName,
        "example/repo",
      );

      assert.equal(
        result.branch,
        "feature",
      );

      assert.equal(
        result.commit,
        "head-sha",
      );

      assert.equal(
        result.baseRef,
        "main",
      );

      assert.equal(
        result.targetRef,
        "feature",
      );

      assert.equal(
        result.changedFiles.length,
        1,
      );

      assert.equal(
        result.changedFiles[0]?.path,
        "src/example.ts",
      );

      assert.equal(
        result.changedFiles[0]?.status,
        "modified",
      );

      assert.equal(
        result.files.length,
        1,
      );

      assert.equal(
        result.files[0]?.path,
        "src/example.ts",
      );

      assert.match(
        result.diff,
        /\+const value = 2;/,
      );

      assert.match(
        result.files[0]?.content ?? "",
        /\+const value = 2;/,
      );

      assert.match(
        result.summary,
        /Pull request #1: Update example/,
      );
    } finally {
      globalThis.fetch =
        originalFetch;
    }
  },
);