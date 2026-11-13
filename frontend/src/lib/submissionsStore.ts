import type { SubmissionDetail, SubmissionSummary, SupportedLanguage } from "./api";

const keyFor = (slug: string) => `podium:submissions:${slug}`;

export function loadSubmissions(slug: string): SubmissionSummary[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(keyFor(slug));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SubmissionSummary[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSubmission(
  slug: string,
  submission: SubmissionSummary & { code?: string }
): void {
  if (typeof window === "undefined") return;
  const current = loadSubmissions(slug);
  const next = [submission, ...current.filter((s) => s.id !== submission.id)];
  localStorage.setItem(keyFor(slug), JSON.stringify(next.slice(0, 200)));
}

export function getStoredSubmission(slug: string, id: string): SubmissionDetail | null {
  const found = loadSubmissions(slug).find((s) => s.id === id);
  if (!found) return null;
  return {
    ...found,
    code: found.code || "// Source is only kept in this browser after you submit.",
  };
}

export function updateSubmissionStatus(
  slug: string,
  id: string,
  patch: Partial<SubmissionSummary>
): void {
  if (typeof window === "undefined") return;
  const current = loadSubmissions(slug);
  const next = current.map((s) => (s.id === id ? { ...s, ...patch } : s));
  localStorage.setItem(keyFor(slug), JSON.stringify(next));
}

export function recordQueuedSubmit(args: {
  slug: string;
  id: string;
  problemId: string;
  problemLetter: string;
  problemTitle: string;
  language: SupportedLanguage;
  code: string;
}): SubmissionSummary {
  const row: SubmissionSummary = {
    id: args.id,
    problemId: args.problemId,
    problemLetter: args.problemLetter,
    problemTitle: args.problemTitle,
    language: args.language,
    status: "queued",
    verdict: null,
    clickedAt: new Date().toISOString(),
    judgedAt: null,
    points: 0,
    code: args.code,
  };
  saveSubmission(args.slug, row);
  return row;
}
