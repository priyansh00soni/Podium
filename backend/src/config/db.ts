import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { dbLogger } from '../utils/logger.js';

// It is critical to enforce this at the connection string level as well.
// We append the parameters safely just in case they are missing from your .env
const rawUrl = process.env.DATABASE_URL || '';
const connectionUrl = new URL(rawUrl);
connectionUrl.searchParams.set('connection_limit', '8');
connectionUrl.searchParams.set('pool_timeout', '20');

const pool = new Pool({
  connectionString: connectionUrl.toString(),
  max: 8, // Strictly capped at 8 to prevent exhausting Supabase connections
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

const adapter = new PrismaPg(pool);
export const prisma = new PrismaClient({ adapter });

export async function connectDb(): Promise<void> {
  try {
    await prisma.$connect();
    dbLogger.info('Database connection established successfully.');
  } catch (error: unknown) {
    dbLogger.error(
      `Database connection failed during startup initialization.`
    );
    process.exit(1);
  }
}

export async function disconnectDb(): Promise<void> {
  await prisma.$disconnect();
  await pool.end();
}