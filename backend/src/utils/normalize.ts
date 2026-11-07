import { createHash } from "crypto";

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function submissionHash(participantId: string, problemId: string, language: string, code: string): string {
    const payload = `${participantId}:${problemId}:${language}:${code}`;
    return createHash("sha256").update(payload).digest("hex");
}