import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { dbLogger } from '../utils/logger.js';


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  allowExitOnIdle: true,
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