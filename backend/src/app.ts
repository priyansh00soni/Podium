import { Express } from "express";
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

app.use('/api/v1', authRouter);
app.use('/api/v1', problemsRouter);
app.use('/api/v1', submissionsRouter);

export default app