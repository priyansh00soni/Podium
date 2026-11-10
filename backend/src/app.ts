import { Express, NextFunction, Request, Response } from "express";
import express from "express";
import cors from 'cors'
import cookieParser from "cookie-parser";

const app:Express = express()

app.use(
    cors({
        origin:process.env.CORS_ORIGIN,
        credentials:true
    })
)

app.use(express.json({limit: '5mb'}))

app.use(express.urlencoded({ extended:true, limit:'5mb'}))


app.use(cookieParser());


import authRouter from './features/auth/auth.routes.js';
import problemsRouter from './features/problems/problems.routes.js';
import submissionsRouter from './features/submissions/submissions.routes.js';
import ApiError from "./utils/ApiError.js";
import { logger } from "./utils/logger.js";

app.use('/api/v1', authRouter);
app.use('/api/v1', problemsRouter);
app.use('/api/v1', submissionsRouter);

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  logger.error(`Unhandled error: ${err instanceof Error ? err.name : "unknown"}`);
  return res.status(500).json({ success: false, message: "Internal server error." });
});

export default app