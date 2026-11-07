import type { Request, Response } from "express";
import asyncHandler from "../../utils/asyncHandler.js";
import { handleLogin } from "./auth.service.js";
import ApiError from "../../utils/ApiError.js";
import { CALLBACK_URL, googleClient } from "../../config/google.js";

const startLoginController = asyncHandler(async (req: Request, res: Response) => {
    const slug = (req.params.slug as string).toLowerCase();

    const authUrl = googleClient.generateAuthUrl({
        scope: ["openid", "email", "profile"],
        redirect_uri: CALLBACK_URL,
        state: slug,
    });

    return res.redirect(authUrl);
});

const loginController = asyncHandler(async (req: Request, res: Response) => {
    if (req.query.error) throw new ApiError(400, "Google sign-in was cancelled.");

    const code = req.query.code as string | undefined;
    const slug = req.query.state as string | undefined;

    if (!code || !slug) throw new ApiError(400, "Missing code or state.");

    const sessionId = await handleLogin(code, slug.toLowerCase(), {
        ip: req.ip ?? "",
        userAgent: req.get("user-agent") ?? "",
    });

    res.cookie("sessionId", sessionId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 12 * 60 * 60 * 1000,
    });

    return res.redirect(`/c/${slug}`);
});

export { startLoginController, loginController };