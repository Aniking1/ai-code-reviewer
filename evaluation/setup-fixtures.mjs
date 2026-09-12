import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";

const root = process.cwd();

const fixtures = [
  {
    name: "evaluation-01-correctness",
    commit: "introduce guest discount defect",
    files: {
      "pricing.ts": {
        clean: `export function calculateDiscount(
  price: number,
  customerType: string,
): number {
  if (customerType === "premium") {
    return price * 0.8;
  }

  if (customerType === "standard") {
    return price * 0.9;
  }

  return price;
}
`,
        defective: `export function calculateDiscount(
  price: number,
  customerType: string,
): number {
  if (customerType === "premium") {
    return price * 0.8;
  }

  if (customerType === "standard") {
    return price * 0.9;
  }

  return price * 0.8;
}
`,
      },
      "pricing.test.ts": {
        clean: `import { calculateDiscount } from "./pricing";

if (
  calculateDiscount(100, "guest") !== 100
) {
  throw new Error(
    "Guest customers should pay the full price.",
  );
}
`,
        defective: `import { calculateDiscount } from "./pricing";

if (
  calculateDiscount(100, "guest") !== 100
) {
  throw new Error(
    "Guest customers should pay the full price.",
  );
}
`,
      },
    },
  },

  {
    name: "evaluation-02-security",
    commit: "introduce command injection vulnerability",
    files: {
      "command.ts": {
        clean: `export function runCommand(
  command: "status" | "version",
) {
  const { execFile } = require("child_process");

  return execFile("git", [
    command === "status"
      ? "status"
      : "--version",
  ]);
}
`,
        defective: `export function runCommand(
  userInput: string,
) {
  return require("child_process").exec(
    userInput,
  );
}
`,
      },
      "handler.ts": {
        clean: `import { runCommand } from "./command";

export function handleRequest(
  req: { body: { command: "status" | "version" } },
) {
  return runCommand(req.body.command);
}
`,
        defective: `export function handleRequest(
  req: { body: { command: string } },
) {
  return require("./command").runCommand(
    req.body.command,
  );
}
`,
      },
    },
  },

  {
    name: "evaluation-03-architecture",
    commit: "bypass repository abstraction",
    files: {
      "database.ts": {
        clean: `export const database = {
  async query(
    sql: string,
    params: unknown[],
  ) {
    return {
      sql,
      params,
    };
  },
};
`,
        defective: `export const database = {
  async query(
    sql: string,
    params: unknown[],
  ) {
    return {
      sql,
      params,
    };
  },
};
`,
      },
      "user-repository.ts": {
        clean: `export interface UserRepository {
  findById(id: string): Promise<{
    id: string;
    name: string;
  }>;
}
`,
        defective: `export interface UserRepository {
  findById(id: string): Promise<{
    id: string;
    name: string;
  }>;
}
`,
      },
      "user-service.ts": {
        clean: `import type {
  UserRepository,
} from "./user-repository";

export class UserService {
  constructor(
    private readonly repository: UserRepository,
  ) {}

  async getUser(id: string) {
    return this.repository.findById(id);
  }
}
`,
        defective: `import { database } from "./database";
import type {
  UserRepository,
} from "./user-repository";

export class UserService {
  constructor(
    private readonly repository: UserRepository,
  ) {}

  async getUser(id: string) {
    return database.query(
      "SELECT * FROM users WHERE id = ?",
      [id],
    );
  }
}
`,
      },
    },
  },

  {
    name: "evaluation-04-performance",
    commit: "introduce quadratic user matching",
    files: {
      "user-matcher.ts": {
        clean: `export interface User {
  id: string;
}

export function matchUsers(
  users: User[],
  ids: string[],
): User[] {
  const usersById = new Map(
    users.map((user) => [user.id, user]),
  );

  return ids
    .map((id) => usersById.get(id))
    .filter(
      (user): user is User =>
        user !== undefined,
    );
}
`,
        defective: `export interface User {
  id: string;
}

export function matchUsers(
  users: User[],
  ids: string[],
): User[] {
  const matches: User[] = [];

  for (const id of ids) {
    for (const user of users) {
      if (user.id === id) {
        matches.push(user);
        break;
      }
    }
  }

  return matches;
}
`,
      },
      "user-matcher.test.ts": {
        clean: `import { matchUsers } from "./user-matcher";

const users = Array.from(
  { length: 100000 },
  (_, index) => ({
    id: String(index),
  }),
);

const ids = Array.from(
  { length: 50000 },
  (_, index) => String(index),
);

const result = matchUsers(users, ids);

if (result.length !== ids.length) {
  throw new Error(
    "All requested users should be matched.",
  );
}
`,
        defective: `import { matchUsers } from "./user-matcher";

const users = Array.from(
  { length: 100000 },
  (_, index) => ({
    id: String(index),
  }),
);

const ids = Array.from(
  { length: 50000 },
  (_, index) => String(index),
);

const result = matchUsers(users, ids);

if (result.length !== ids.length) {
  throw new Error(
    "All requested users should be matched.",
  );
}
`,
      },
    },
  },

  {
    name: "evaluation-05-maintainability",
    commit: "introduce duplicated discount logic",
    files: {
      "pricing-service.ts": {
        clean: `export function calculateDiscount(
  price: number,
  customerType: string,
): number {
  if (customerType === "premium") {
    return price * 0.8;
  }

  if (customerType === "standard") {
    return price * 0.9;
  }

  return price;
}
`,
        defective: `export function calculateDiscount(
  price: number,
  customerType: string,
): number {
  if (customerType === "premium") {
    return price * 0.8;
  }

  if (customerType === "standard") {
    return price * 0.9;
  }

  return price;
}
`,
      },
      "order-handler.ts": {
        clean: `import {
  calculateDiscount,
} from "./pricing-service";

export function calculateOrderTotal(
  price: number,
  customerType: string,
): number {
  return calculateDiscount(
    price,
    customerType,
  );
}
`,
        defective: `import {
  calculateDiscount,
} from "./pricing-service";

export function calculateOrderTotal(
  price: number,
  customerType: string,
): number {
  if (customerType === "premium") {
    return price * 0.8;
  }

  if (customerType === "standard") {
    return price * 0.9;
  }

  return price;
}
`,
      },
    },
  },
];

function git(repositoryPath, args) {
  return execFileSync(
    "git",
    ["-C", repositoryPath, ...args],
    { encoding: "utf8" },
  );
}

async function setupFixture(fixture) {
  const repositoryPath = path.join(
    root,
    "workspace",
    "repositories",
    fixture.name,
  );

  const gitPath = path.join(
    repositoryPath,
    ".git",
  );

  await fs.mkdir(repositoryPath, {
    recursive: true,
  });

  await fs.rm(gitPath, {
    recursive: true,
    force: true,
  });

  for (const [file, versions] of Object.entries(
    fixture.files,
  )) {
    await fs.writeFile(
      path.join(repositoryPath, file),
      versions.clean,
      "utf8",
    );
  }

  git(repositoryPath, [
    "init",
    "-b",
    "main",
  ]);

  git(repositoryPath, [
    "add",
    ".",
  ]);

  git(repositoryPath, [
    "commit",
    "-m",
    "add clean baseline",
  ]);

  for (const [file, versions] of Object.entries(
    fixture.files,
  )) {
    await fs.writeFile(
      path.join(repositoryPath, file),
      versions.defective,
      "utf8",
    );
  }

  git(repositoryPath, [
    "add",
    ".",
  ]);

  git(repositoryPath, [
    "commit",
    "-m",
    fixture.commit,
  ]);

  console.log(
    `${fixture.name}: fixture ready`,
  );
}

for (const fixture of fixtures) {
  await setupFixture(fixture);
}

console.log(
  "All five evaluation fixtures are ready.",
);