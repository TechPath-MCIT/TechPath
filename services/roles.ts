// services/roles.ts
import { pool } from '@/lib/db';

/**
 * Fetches a bounded list of roles from the cloud database
 * @param limit Number of records to return
 */
export async function getRolesList(limit: number = 10) {
  const queryText = 'SELECT * FROM "roles" LIMIT $1;';
  const result = await pool.query(queryText, [limit]);
  return result.rows;
}

/**
 * Fetches a single role matching a specific ID parameter
 */
export async function getRoleById(roleId: number) {
  const queryText = 'SELECT * FROM "roles" WHERE id = $1;';
  const result = await pool.query(queryText, [roleId]);
  return result.rows[0] || null;
}

/**
 * Inserts a brand new tracking role record down into AWS RDS
 */
export async function createNewRole(title: string, department: string) {
  const queryText = `
    INSERT INTO "roles" (title, department, created_at)
    VALUES ($1, $2, NOW())
    RETURNING *;
  `;
  const result = await pool.query(queryText, [title, department]);
  return result.rows[0];
}