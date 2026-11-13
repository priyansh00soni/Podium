import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
]);

function backendOrigin(): string {
  return (
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:8000"
  ).replace(/\/+$/, "");
}

function joinPath(parts: string[]): string {
  return parts.map((p) => encodeURIComponent(p)).join("/");
}

function copyRequestHeaders(req: NextRequest): Headers {
  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });
  return headers;
}

function applySetCookies(from: Response, to: NextResponse) {
  const getSetCookie = (
    from.headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie?.();
  if (getSetCookie && getSetCookie.length > 0) {
    for (const cookie of getSetCookie) {
      to.headers.append("set-cookie", stripCookieDomain(cookie));
    }
    return;
  }
  const single = from.headers.get("set-cookie");
  if (single) {
    to.headers.append("set-cookie", stripCookieDomain(single));
  }
}

function stripCookieDomain(cookie: string): string {
  let cleaned = cookie.replace(/;\s*domain=[^;]*/i, "");
  // In local development over HTTP, strip 'Secure' so browser accepts the cookie on http://localhost:3000
  if (process.env.NODE_ENV !== "production") {
    cleaned = cleaned.replace(/;\s*secure/i, "");
  }
  return cleaned;
}

function resolveRedirectLocation(location: string, req: NextRequest, backend: string): string {
  if (location.startsWith("http://") || location.startsWith("https://")) {
    try {
      const loc = new URL(location);
      const back = new URL(backend);
      if (loc.origin === back.origin) {
        return new URL(`${loc.pathname}${loc.search}${loc.hash}`, req.nextUrl.origin).toString();
      }
    } catch {
      return location;
    }
    return location;
  }
  return new URL(location, req.nextUrl.origin).toString();
}

function clearSessionResponse(): NextResponse {
  const res = NextResponse.json({ success: true, message: "Signed out." });
  res.cookies.set("sessionId", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}

async function proxy(req: NextRequest, path: string[]): Promise<NextResponse> {
  const joined = path.join("/");

  if (
    req.method === "POST" &&
    path.length === 4 &&
    path[0] === "c" &&
    path[2] === "auth" &&
    path[3] === "logout"
  ) {
    return clearSessionResponse();
  }

  const backend = backendOrigin();
  const target = `${backend}/api/v1/${joinPath(path)}${req.nextUrl.search}`;
  const headers = copyRequestHeaders(req);
  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Cannot reach the contest server." },
      { status: 503 }
    );
  }

  // Handle successful redirects (3xx) before error checks, since upstream.ok is false for 3xx responses
  const location = upstream.headers.get("location");
  if (location && upstream.status >= 300 && upstream.status < 400) {
    const res = NextResponse.redirect(
      resolveRedirectLocation(location, req, backend),
      upstream.status as 301 | 302 | 303 | 307 | 308
    );
    applySetCookies(upstream, res);
    return res;
  }

  if (joined === "login" && !upstream.ok) {
    let message = "Sign-in failed. Check that you used the email you registered with.";
    try {
      const json = (await upstream.clone().json()) as { message?: string };
      if (json?.message) message = json.message;
    } catch {
      // keep default
    }
    const slug = req.nextUrl.searchParams.get("state") || "";
    const errorUrl = new URL("/login/error", req.nextUrl.origin);
    errorUrl.searchParams.set("message", message);
    if (slug) errorUrl.searchParams.set("slug", slug);
    return NextResponse.redirect(errorUrl);
  }

  const body = await upstream.arrayBuffer();
  const res = new NextResponse(body, { status: upstream.status });
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "set-cookie") return;
    if (HOP_BY_HOP.has(lower)) return;
    res.headers.set(key, value);
  });
  applySetCookies(upstream, res);
  return res;
}

type Ctx = { params: Promise<{ path: string[] }> };

async function handle(req: NextRequest, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path || []);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const HEAD = handle;
export const OPTIONS = handle;
