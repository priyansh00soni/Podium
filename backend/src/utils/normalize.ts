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