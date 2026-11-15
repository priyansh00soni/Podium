import type { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import { handleLogin } from "./auth.service.js";
import ApiError from "../../utils/ApiError.js";
import { CALLBACK_URL, googleClient } from "../../config/google.js";
import { prisma } from "../../config/db.js";

const startLoginController = asyncHandler(async (req: Request, res: Response) => {
    // Determine redirect destination after login
    let returnTo = (req.query.returnTo as string) || "";
    if (!returnTo && req.params.slug) {
        returnTo = `/c/${req.params.slug}`;
    }
    if (!returnTo) {
        returnTo = "/";
    }

    const authUrl = googleClient.generateAuthUrl({
        scope: ["openid", "email", "profile"],
        redirect_uri: CALLBACK_URL,
        state: returnTo,
    });

    return res.redirect(authUrl);
});

const startAdminLoginController = asyncHandler(async (req: Request, res: Response) => {
    const authUrl = googleClient.generateAuthUrl({
        scope: ["openid", "email", "profile"],
        redirect_uri: CALLBACK_URL,
        state: "/admin",
    });

    return res.redirect(authUrl);
});

const loginController = asyncHandler(async (req: Request, res: Response) => {
    if (req.query.error) throw new ApiError(400, "Google sign-in was cancelled.");

    const code = req.query.code as string | undefined;
    const returnTo = (req.query.state as string) || "/";

    if (!code) throw new ApiError(400, "Missing authorization code.");

    const loginResult = await handleLogin(code, {
        ip: req.ip ?? "",
        userAgent: req.get("user-agent") ?? "",
    });

    // CRITICAL FIX: Cross-origin cookies require sameSite: "none" and secure: true
    const cookieOptions = {
        httpOnly: true,
        sameSite: "none" as const,
        secure: true,
        maxAge: 12 * 60 * 60 * 1000,
        path: "/",
    };

    // Standard session cookie for the whole platform
    res.cookie("sessionId", loginResult.sessionId, cookieOptions);
    // Legacy compatibility cookie
    res.cookie("sid_platform", loginResult.sessionId, cookieOptions);

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    // Route administrators to /admin by default if no specific return path was requested
    let targetPath = returnTo;
    if (loginResult.user.platformRole === "admin" && (returnTo === "/" || returnTo === "admin")) {
        targetPath = "/admin";
    }

    if (!targetPath.startsWith("/")) {
        targetPath = `/${targetPath}`;
    }

    return res.redirect(`${frontendUrl}${targetPath}`);
});

const getMeController = asyncHandler(async (req: Request, res: Response) => {
    const membership = req.membership;
    if (!membership) throw new ApiError(401, "Session invalid or expired.");

    return res.status(200).json({
        success: true,
        data: {
            id: membership.user.id,
            participantId: membership.id,
            name: membership.user.name,
            email: membership.user.email,
            role: membership.role,
            pending: false
        }
    });
});

const getPlatformMeController = asyncHandler(async (req: Request, res: Response) => {
    const sessionId = req.cookies?.sessionId || req.cookies?.sid_platform;

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

const logoutController = asyncHandler(async (req: Request, res: Response) => {
    const sessionId = req.cookies?.sessionId || req.cookies?.sid_platform;
    if (sessionId) {
        await prisma.session.deleteMany({ where: { id: sessionId } });
    }

    // CRITICAL FIX: To delete a cross-origin cookie, the clear command MUST match the secure/sameSite flags
    const clearCookieOptions = { 
        path: "/", 
        sameSite: "none" as const, 
        secure: true 
    };

    res.clearCookie("sessionId", clearCookieOptions);
    res.clearCookie("sid_platform", clearCookieOptions);
    
    return res.status(200).json({ success: true, message: "Logged out successfully." });
});

export {
    startLoginController,
    startAdminLoginController,
    loginController,
    getMeController,
    getPlatformMeController,
    logoutController
};