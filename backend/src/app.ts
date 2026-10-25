import { Express } from "express";
import express from "express";
import cors from 'cors'

const app:Express = express()

app.use(
    cors({
        origin:process.env.CORS_ORIGIN,
        credentials:true
    })
)

app.use(express.json({limit: '5mb'}))

app.use(express.urlencoded({ extended:true, limit:'5mb'}))

app.use(express.static('public'))



export default app