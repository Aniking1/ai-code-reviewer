export interface UserRepository {
  findById(id: string): Promise<{
    id: string;
    name: string;
  }>;
}
