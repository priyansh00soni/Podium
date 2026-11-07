import {PgBoss} from 'pg-boss';
import { workerLogger } from '../utils/logger.js'; 

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is missing');
}

export const boss = new PgBoss(databaseUrl);

boss.on('error', (error) => {
     workerLogger.error(`PgBoss error: ${error instanceof Error ? error.name : 'unknown'}`);
});

export async function startQueue() {
  workerLogger.info('Starting job queue...');
  await boss.start();
  
  // Must be called after start() to ensure the database connection is active.
  // Enforces 0 retries and a 3-minute timeout at the queue level.
  await boss.createQueue('judge-submission', { retryLimit: 0, expireInSeconds: 180 });
  
  workerLogger.info('Job queue started successfully.');
}

export async function stopQueue() {
  workerLogger.info('Stopping job queue...');
  await boss.stop({ graceful: true, timeout: 5000 });
  workerLogger.info('Job queue stopped.');
}