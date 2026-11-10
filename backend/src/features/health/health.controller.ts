import { Request, Response } from 'express';
import { prisma } from "../../config/db.js";

export async function healthCheck(req: Request, res: Response) {
  try {
    // 1. Ping the database
    await prisma.$queryRaw`SELECT 1`;

    // 2. Ping Judge0
    const judgeResponse = await fetch(`${process.env.JUDGE_URL}/system_info`, {
      headers: { 'X-Auth-Token': process.env.JUDGE_AUTH_TOKEN || '' }
    });
    console.log("hi");
    
    if (!judgeResponse.ok) {
      throw new Error(`Judge0 returned status: ${judgeResponse.status}`);
    }

    // Both passed! Return a simple 200 OK
    return res.status(200).json({
        message: "All cool!",
    });

  } catch (error) {
    console.error('[Health Check Failed]', error instanceof Error ? error.message : 'Unknown error');
    
    return res.sendStatus(503);
  }
}