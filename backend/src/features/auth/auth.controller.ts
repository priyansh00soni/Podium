import type { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import { handleLogin, getCurrentParticipant } from "./auth.service.js";
import ApiError from "../../utils/ApiError.js";
import { CALLBACK_URL, googleClient } from "../../config/google.js";
import { prisma } from "../../config/db.js";

const startLoginController = asyncHandler(async (req: Request, res: Response) => {
    const slug = (req.params.slug as string).toLowerCase();

    const authUrl = googleClient.generateAuthUrl({
        scope: ["openid", "email", "profile"],
        redirect_uri: CALLBACK_URL,
        state: slug,
    });

    return res.redirect(authUrl);
});

const startAdminLoginController = asyncHandler(async (req: Request, res: Response) => {
    const authUrl = googleClient.generateAuthUrl({
        scope: ["openid", "email", "profile"],
        redirect_uri: CALLBACK_URL,
        state: "admin",
    });

    return res.redirect(authUrl);
});

const loginController = asyncHandler(async (req: Request, res: Response) => {
    if (req.query.error) throw new ApiError(400, "Google sign-in was cancelled.");

    const code = req.query.code as string | undefined;
    const slug = req.query.state as string | undefined;

    if (!code || !slug) throw new ApiError(400, "Missing code or state.");

    const loginResult = await handleLogin(code, slug.toLowerCase(), {
        ip: req.ip ?? "",
        userAgent: req.get("user-agent") ?? "",
    });

    const cookieOptions = {
        httpOnly: true,
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
        maxAge: 12 * 60 * 60 * 1000,
        path: "/",
    };

    // Isolated cookies per contest and for platform admin
    if (loginResult.slug === "admin" || loginResult.isPlatformAdmin) {
        res.cookie("sid_platform", loginResult.sessionId, cookieOptions);
    }
    if (loginResult.slug && loginResult.slug !== "admin") {
        res.cookie(`sid_${loginResult.slug}`, loginResult.sessionId, cookieOptions);
    }
    // Backward-compatible fallback
    res.cookie("sessionId", loginResult.sessionId, cookieOptions);

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    if (loginResult.slug === "admin") {
        return res.redirect(`${frontendUrl}/admin`);
    }
    return res.redirect(`${frontendUrl}/c/${loginResult.slug}`);
});

const getMeController = asyncHandler(async (req: Request, res: Response) => {
    const membership = req.membership;
    if (!membership) throw new ApiError(401, "Session invalid or expired.");

    const participant = await getCurrentParticipant(membership.contestId, membership.id);
    return res.status(200).json({ success: true, data: participant });
});

const getPlatformMeController = asyncHandler(async (req: Request, res: Response) => {
    const cookies = req.cookies || {};
    let sessionId = cookies.sid_platform || cookies.sessionId;
    if (!sessionId) {
        for (const [key, val] of Object.entries(cookies)) {
            if (key.startsWith("sid_") && typeof val === "string") {
                sessionId = val;
                break;
            }
        }
    }

    if (!sessionId) {
        return res.status(200).json({ success: true, data: null });
    }

    const session = await prisma.session.findUnique({
        where: { id: sessionId },
        include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
        return res.status(200).json({ success: true, data: null });
    }

    return res.status(200).json({
        success: true,
        data: {
            id: session.user.id,
            name: session.user.name,
            email: session.user.email,
            platformRole: session.user.platformRole ?? null,
        }
    });
});

export {
    startLoginController,
    startAdminLoginController,
    loginController,
    getMeController,
    getPlatformMeController
};
