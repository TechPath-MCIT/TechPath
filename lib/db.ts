// lib/db.ts
import { Pool } from 'pg';

const globalForPg = globalThis as unknown as { pool: Pool | undefined };

export const pool = globalForPg.pool ?? new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  
  // Pool Sizing configurations
  max: parseInt(process.env.DB_POOL_MAX || '20', 10),
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONN_TIMEOUT || '2000', 10),
  
  // AWS RDS requires SSL encrypted connection requests over the public web
  ssl: {
    rejectUnauthorized: false // Handles handshakes smoothly without needing local certificate paths
  },
  
  // Session query timeouts
  statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000', 10),
  query_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT || '30000', 10)
});

if (process.env.NODE_ENV !== 'production') globalForPg.pool = pool;