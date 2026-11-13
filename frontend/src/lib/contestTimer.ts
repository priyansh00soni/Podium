/**
 * Utilities for contest session timing and per-problem tracking.
 * Stored in browser localStorage scoped by contest slug and problem ID.
 */

export function isContestStarted(slug: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`podium:contest_started:${slug}`) === "true";
}

export function startContest(slug: string): number {
  if (typeof window === "undefined") return Date.now();
  const existing = localStorage.getItem(`podium:contest_start_time:${slug}`);
  let startMs = existing ? parseInt(existing, 10) : 0;
  if (!startMs || isNaN(startMs)) {
    startMs = Date.now();
  }
  localStorage.setItem(`podium:contest_started:${slug}`, "true");
  localStorage.setItem(`podium:contest_start_time:${slug}`, startMs.toString());
  return startMs;
}

export function getContestStartTime(slug: string): number | null {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(`podium:contest_start_time:${slug}`);
  if (!val) return null;
  const num = parseInt(val, 10);
  return isNaN(num) ? null : num;
}

export function getProblemTimeSpent(slug: string, problemId: string): number {
  if (typeof window === "undefined") return 0;
  const val = localStorage.getItem(`podium:problem_time:${slug}:${problemId}`);
  if (!val) return 0;
  const num = parseInt(val, 10);
  return isNaN(num) ? 0 : num;
}

export function addProblemTimeSpent(
  slug: string,
  problemId: string,
  additionalSeconds: number = 1
): number {
  if (typeof window === "undefined") return 0;
  const current = getProblemTimeSpent(slug, problemId);
  const updated = current + additionalSeconds;
  localStorage.setItem(`podium:problem_time:${slug}:${problemId}`, updated.toString());
  return updated;
}

export function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 0) totalSeconds = 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

export function formatTimeSpentBadge(totalSeconds: number): string {
  if (!totalSeconds || totalSeconds <= 0) return "--";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

