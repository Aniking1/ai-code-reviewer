
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getRepositoryInfo,
  listFiles,
  readFile,
  validateRepositoryPath,
} from "../repository-service.js";

describe("repository-service", () => {
  it("returns metadata for a valid Git repository", async () => {
    const info = await getRepositoryInfo(
      "./workspace/repositories/sample-repo",
    );

    assert.equal(info.name, "sample-repo");
    assert.equal(info.isGitRepository, true);
    assert.equal(info.branch, "main");
    assert.match(info.commit ?? "", /^[0-9a-f]{40}$/);
  });

  it("rejects a repository outside the workspace", async () => {
    await assert.rejects(
      () => validateRepositoryPath("."),
      /Repository path must be inside the workspace/,
    );
  });

  it("lists files in the repository", async () => {
    const files = await listFiles(
      "./workspace/repositories/sample-repo",
    );

    assert.deepEqual(files, ["hello.ts"]);
  });

  it("reads a file inside the repository", async () => {
    const content = await readFile(
      "./workspace/repositories/sample-repo",
      "hello.ts",
    );

    assert.match(content, /export function hello/);
  });

  it("rejects file paths outside the repository", async () => {
    await assert.rejects(
      () =>
        readFile(
          "./workspace/repositories/sample-repo",
          "../../hello.ts",
        ),
      /File path must remain inside the repository/,
    );
  });
});

