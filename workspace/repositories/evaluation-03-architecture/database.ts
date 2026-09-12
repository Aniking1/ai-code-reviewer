export const database = {
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
