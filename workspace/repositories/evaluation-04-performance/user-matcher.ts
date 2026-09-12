export interface User {
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
