import { database } from "./database";
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
