import { dbLogger } from "../utils/logger.js";

dbLogger.info('normal line');
dbLogger.info({ DATABASE_URL: 'postgres://user:fakepass@host/db' }, 'secret test');