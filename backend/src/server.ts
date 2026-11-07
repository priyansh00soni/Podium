import app from "./app.js";
import { connectDb, disconnectDb } from "./config/db.js";
import { logger } from "./utils/logger.js";
import { startQueue, stopQueue } from "./worker/queue.js";

let shuttingDown = false;

await connectDb();
await startQueue();

const server = app.listen(process.env.PORT || 8000, () => {
  logger.info(`App listens at port: ${process.env.PORT || 8000}`);
});

const shutdown = async () => {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info("Shutting Down Gracefully!");

  setTimeout(() => process.exit(1), 10000);

  try {
    await new Promise((resolve) => server.close(resolve));
    await stopQueue();
    await disconnectDb();
    process.exit(0);
  } catch (error) {
    const errorName = error instanceof Error ? error.name : 'UnknownShutdownError';
    logger.error(`Graceful shutdown failed: ${errorName}`);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
