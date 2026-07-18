// lib/db.ts
import { Pool } from 'pg';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

// 1. Re-initialize the native PG driver pool using explicit options
export const pool = new Pool({
  // Use your granular env variables directly to force the connection parameters
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  
  // ⚡ Crucial: Force the adapter to accept AWS RDS certificates smoothly
  ssl: {
    rejectUnauthorized: false 
  }
});

// 2. Wrap it inside the Prisma 7 Driver Adapter instance
const adapter = new PrismaPg(pool);

// 3. Hand off the adapter to the PrismaClient constructor
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  adapter: adapter,
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;