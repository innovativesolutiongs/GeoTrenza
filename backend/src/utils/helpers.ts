import { AppDataSource } from "../ormconfig";

export const dateFormat = (d: string) => {
  return new Date(d).toISOString().split("T")[0];
};

export const runCountQuery = async (table: string, where: string) => {
  const result = await AppDataSource.query(
    `SELECT COUNT(*) AS total FROM ${table} ${where}`
  );
  return result[0].total;
};
