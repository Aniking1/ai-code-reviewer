import { matchUsers } from "./user-matcher";

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
