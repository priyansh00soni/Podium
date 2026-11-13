export const API_PREFIX = "/api/v1";

export type ContestState = "before" | "running" | "ended" | "unknown" | "unavailable";
export type ParticipantRole = "participant" | "moderator";
export type SupportedLanguage = "c" | "cpp" | "java" | "javascript" | "python";
export type SubmissionStatus = "queued" | "judging" | "done";
export type Verdict =
  | "accepted"
  | "wrong_answer"
  | "tle"
  | "runtime_error"
  | "compile_error"
  | "judge_error";

export interface ApiContest {
  slug: string;
  title: string;
  startsAt?: string;
  endsAt?: string;
  state?: ContestState;
}

export interface ContestsResponse {
  contests: ApiContest[];
  serverNow?: string;
  backendOk?: boolean;
}

export interface ContestDetail {
  slug: string;
  title: string;
  description?: string | null;
  startsAt?: string;
  endsAt?: string;
  state: ContestState;
  leaderboardPublished: boolean;
  serverNow?: string;
}

export interface CurrentUser {
  id: string;
  participantId: string;
  name: string;
  email: string;
  role: ParticipantRole;
  pending: boolean;
}

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  platformRole: "admin" | null;
}

export interface ProblemSample {
  id?: number | string;
  input: string;
  expectedOutput: string;
}

export interface ProblemSummary {
  id: string;
  number: number;
  letter: string;
  title: string;
  statement?: string;
  points: number;
  type: string;
  starterCode?: Record<SupportedLanguage, string>;
  samples?: ProblemSample[];
}

export interface ProblemDetail {
  id: string;
  number: number;
  letter: string;
  title: string;
  statement: string;
  points: number;
  type: string;
  starterCode?: Record<SupportedLanguage, string>;
  timeLimit?: string;
  memoryLimit?: string;
  samples: ProblemSample[];
}

export interface SubmitPayload {
  language: SupportedLanguage;
  code: string;
}

export interface RunTestCaseResult {
  input: string;
  expectedOutput: string;
  actualOutput: string | null;
  status: "passed" | "failed" | "error";
  time?: string;
  memory?: string;
  error?: string | null;
}

export interface RunCodeResponse {
  success: boolean;
  verdict: "passed" | "failed" | "error";
  compileError?: string | null;
  totalTests: number;
  passedTests: number;
  testCases: RunTestCaseResult[];
}

export async function runSampleCode(
  slug: string,
  problemId: string,
  body: { language: SupportedLanguage; code: string; customInput?: string }
): Promise<RunCodeResponse> {
  const res = await request<unknown>(
    `/c/${encodeURIComponent(slug)}/problems/${encodeURIComponent(problemId)}/run`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
  return unwrapData<RunCodeResponse>(res);
}

export interface SubmitResponse {
  id: string;
  status: SubmissionStatus;
  verdict?: Verdict | null;
  judgedAt?: string | null;
  points?: number;
}

export interface SubmissionSummary {
  id: string;
  problemId: string;
  problemLetter: string;
  problemTitle: string;
  language: string;
  status: SubmissionStatus;
  verdict: Verdict | null;
  clickedAt: string;
  judgedAt?: string | null;
  createdAt?: string;
  points: number;
  code?: string;
  compileOutput?: string | null;
}

export interface SubmissionDetail extends SubmissionSummary {
  code: string;
  compileOutput?: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  total: number;
  lastSolveAt: string;
}

export interface LeaderboardResponse {
  data: LeaderboardEntry[];
  published: boolean;
}

export interface CreateProblemPayload {
  number: number;
  title: string;
  statement: string;
  points: number;
  type?: string;
  starterCode: Record<SupportedLanguage, string>;
  driverCode: Record<SupportedLanguage, string>;
  testCases: {
    input: string;
    expectedOutput: string;
    isSample: boolean;
    position: number;
  }[];
}

export class ApiRequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export class InvalidSubmissionResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSubmissionResponseError";
  }
}

export function titleFromSlug(slug: string): string {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function letterFromNumber(number: number): string {
  if (!number || number < 1) return "A";
  return String.fromCharCode(64 + number);
}

export function getSignInUrl(slug: string): string {
  return `${API_PREFIX}/c/${encodeURIComponent(slug)}/auth/google`;
}

export function getAdminSignInUrl(): string {
  return `${API_PREFIX}/auth/google/admin`;
}

export async function getPlatformMe(signal?: AbortSignal): Promise<PlatformUser | null> {
  try {
    const res = await request<unknown>("/me", { signal });
    return unwrapData<PlatformUser | null>(res);
  } catch {
    return null;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_PREFIX}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  if (res.status === 204) {
    return {} as T;
  }

  let json: Record<string, unknown> | null = null;
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const errorMsg =
      (json && typeof json.message === "string" && json.message) ||
      `Request failed with status ${res.status}`;
    throw new ApiRequestError(res.status, errorMsg);
  }

  return json as T;
}

function unwrapData<T>(res: unknown): T {
  if (res && typeof res === "object" && "data" in res) {
    return (res as { data: T }).data;
  }
  return res as T;
}

function mapProblem(raw: Record<string, unknown>, idx: number): ProblemSummary {
  const number = typeof raw.number === "number" ? raw.number : idx + 1;
  const samplesSource = Array.isArray(raw.samples)
    ? raw.samples
    : Array.isArray(raw.testCases)
      ? raw.testCases
      : [];
  const samples = samplesSource.map((s) => {
    const sample = s as Record<string, unknown>;
    return {
      id: sample.id as number | string | undefined,
      input: String(sample.input ?? ""),
      expectedOutput: String(sample.expectedOutput ?? ""),
    };
  });
  return {
    id: String(raw.id ?? ""),
    number,
    letter: typeof raw.letter === "string" ? raw.letter : letterFromNumber(number),
    title: String(raw.title ?? "Untitled"),
    statement: typeof raw.statement === "string" ? raw.statement : "",
    points: typeof raw.points === "number" ? raw.points : 0,
    type: typeof raw.type === "string" ? raw.type : "coding",
    starterCode: (raw.starterCode as Record<SupportedLanguage, string>) || undefined,
    samples,
  };
}

export async function getHealth(): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await request<{ message?: string }>("/health");
    return { ok: true, message: res.message || "All cool!" };
  } catch (err) {
    if (err instanceof ApiRequestError) {
      return { ok: false, message: err.message };
    }
    return { ok: false, message: "Cannot reach the contest server." };
  }
}

export async function getProblems(slug: string, signal?: AbortSignal): Promise<ProblemSummary[]> {
  const res = await request<unknown>(`/c/${encodeURIComponent(slug)}/problems`, { signal });
  const list = unwrapData<unknown[]>(res);
  const rows = Array.isArray(list) ? list : [];
  return rows.map((p, idx) => mapProblem((p || {}) as Record<string, unknown>, idx));
}

export async function getProblem(slug: string, problemId: string, signal?: AbortSignal): Promise<ProblemDetail> {
  const list = await getProblems(slug, signal);
  const needle = decodeURIComponent(problemId).toLowerCase();
  const found = list.find(
    (p) =>
      p.id.toLowerCase() === needle ||
      p.letter.toLowerCase() === needle ||
      String(p.number) === needle
  );
  if (!found) {
    throw new ApiRequestError(404, "Problem not found or inactive.");
  }
  return {
    id: found.id,
    number: found.number,
    letter: found.letter,
    title: found.title,
    statement: found.statement || "",
    points: found.points,
    type: found.type,
    starterCode: found.starterCode,
    timeLimit: languageLimitHint(),
    memoryLimit: "256 MB",
    samples: found.samples || [],
  };
}

function languageLimitHint(): string {
  return "1–3s by language";
}

/**
 * Load the server's contest state and schedule. Signed-out visitors get no guessed metadata.
 */
export async function getContest(slug: string, signal?: AbortSignal): Promise<ContestDetail> {
  try {
    const res = await request<unknown>(`/c/${encodeURIComponent(slug)}`, { signal });
    return unwrapData<ContestDetail>(res);
  } catch (err) {
    if (!(err instanceof ApiRequestError && err.status === 401)) {
      throw err;
    }
  }

  return {
    slug,
    title: slug,
    state: "unavailable",
    leaderboardPublished: false,
  };
}

/**
 * Load the participant's identity and role from the authenticated session.
 */
export async function getMe(slug: string, signal?: AbortSignal): Promise<CurrentUser> {
  const res = await request<unknown>(`/c/${encodeURIComponent(slug)}/me`, { signal });
  return unwrapData<CurrentUser>(res);
}

export async function submitSolution(
  slug: string,
  problemId: string,
  body: SubmitPayload
): Promise<SubmitResponse> {
  const res = await request<unknown>(
    `/c/${encodeURIComponent(slug)}/problems/${encodeURIComponent(problemId)}/submit`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
  const data = unwrapData<SubmitResponse>(res);
  if (!data || typeof data.id !== "string" || !["queued", "judging", "done"].includes(data.status)) {
    throw new InvalidSubmissionResponseError("The server returned an invalid submission.");
  }
  return {
    id: data.id,
    status: data.status,
    verdict: data.verdict ?? null,
    judgedAt: data.judgedAt ?? null,
    points: data.points,
  };
}

/**
 * Poll the saved submission without creating or re-submitting code.
 */
export async function pollSubmission(
  slug: string,
  id: string,
  signal?: AbortSignal
): Promise<SubmissionDetail> {
  return getSubmission(slug, id, signal);
}

export async function getLeaderboard(slug: string): Promise<LeaderboardResponse> {
  const res = await request<{ data?: LeaderboardEntry[]; published?: boolean }>(
    `/c/${encodeURIComponent(slug)}/leaderboard`
  );
  const rows = Array.isArray(res.data) ? res.data : [];
  return {
    data: rows.map((row) => ({
      rank: row.rank,
      name: row.name,
      total: row.total,
      lastSolveAt:
        typeof row.lastSolveAt === "string"
          ? row.lastSolveAt
          : new Date(row.lastSolveAt as unknown as string).toISOString(),
    })),
    published: Boolean(res.published),
  };
}

export async function createProblem(
  slug: string,
  payload: CreateProblemPayload
): Promise<{ id: string; title: string }> {
  const res = await request<unknown>(`/c/${encodeURIComponent(slug)}/moderator/problems`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = unwrapData<{ id: string; title: string }>(res);
  return data;
}

export async function logout(_slug: string): Promise<void> {
  await request<void>(`/c/${encodeURIComponent(_slug)}/auth/logout`, {
    method: "POST",
  });
}

/**
 * Integrity reporting is best effort and must not interrupt editing or submission.
 */
export async function postEvent(
  _slug: string,
  _type:
    | "paste_blocked"
    | "fullscreen_exit"
    | "visibility_hidden"
    | "permission_denied"
    | "camera_stopped"
    | "screenshare_stopped"
): Promise<void> {
  try {
    await request(`/c/${encodeURIComponent(_slug)}/events`, {
      method: "POST",
      body: JSON.stringify({ type: _type }),
      keepalive: true,
    });
  } catch {
    // The contest can continue when an integrity event cannot be delivered.
  }
}

export async function getContests(): Promise<ContestsResponse> {
  const health = await getHealth();
  const recent = loadRecentContests();
  return {
    contests: recent,
    backendOk: health.ok,
  };
}

const RECENT_KEY = "podium:recent-contests";

export function loadRecentContests(): ApiContest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ApiContest[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function rememberContest(slug: string, title?: string): void {
  if (typeof window === "undefined") return;
  const entry: ApiContest = {
    slug,
    title: title || slug,
    state: "unknown",
  };
  const rest = loadRecentContests().filter((c) => c.slug !== slug);
  localStorage.setItem(RECENT_KEY, JSON.stringify([entry, ...rest].slice(0, 12)));
}

export async function getSubmissions(slug: string, signal?: AbortSignal): Promise<SubmissionSummary[]> {
  const res = await request<unknown>(`/c/${encodeURIComponent(slug)}/submissions`, { signal });
  const submissions = unwrapData<SubmissionSummary[]>(res);
  if (!Array.isArray(submissions)) throw new InvalidSubmissionResponseError("The server returned an invalid submission history.");
  return submissions;
}

export async function getSubmission(slug: string, id: string, signal?: AbortSignal): Promise<SubmissionDetail> {
  const res = await request<unknown>(
    `/c/${encodeURIComponent(slug)}/submissions/${encodeURIComponent(id)}`,
    { signal }
  );
  const submission = unwrapData<SubmissionDetail>(res);
  if (!submission || submission.id !== id) throw new InvalidSubmissionResponseError("The server returned a different submission.");
  if (!["queued", "judging", "done"].includes(submission.status)) {
    throw new InvalidSubmissionResponseError("The server returned an invalid submission status.");
  }
  return submission;
}

export interface AdminContestSummary {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  leaderboardPublished: boolean;
  createdAt: string;
  _count: {
    participants: number;
    problems: number;
    submissions: number;
    allowedEmails: number;
  };
}

export interface AdminContestDetail extends AdminContestSummary {
  allowedEmails: { contestId: string; email: string; name?: string | null; rollNumber?: string | null }[];
  participants: { id: string; role: string; user: { id: string; name: string; email: string } }[];
  problems: { id: string; number: number; title: string; points: number; type: string; status: string }[];
}

export interface CreateAdminContestPayload {
  slug: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  leaderboardPublished?: boolean;
}

export interface UpdateAdminContestPayload {
  title?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  leaderboardPublished?: boolean;
}

export interface AdminStats {
  totalContests: number;
  totalUsers: number;
  totalSubmissions: number;
  pendingQueue: number;
}

export async function getAdminContests(): Promise<AdminContestSummary[]> {
  const res = await request<unknown>("/admin/contests");
  return unwrapData<AdminContestSummary[]>(res);
}

export async function getAdminContestDetail(id: string): Promise<AdminContestDetail> {
  const res = await request<unknown>(`/admin/contests/${encodeURIComponent(id)}`);
  return unwrapData<AdminContestDetail>(res);
}

export async function createAdminContest(payload: CreateAdminContestPayload): Promise<AdminContestSummary> {
  const res = await request<unknown>("/admin/contests", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return unwrapData<AdminContestSummary>(res);
}

export async function updateAdminContest(id: string, payload: UpdateAdminContestPayload): Promise<AdminContestSummary> {
  const res = await request<unknown>(`/admin/contests/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return unwrapData<AdminContestSummary>(res);
}

export async function addAdminAllowedEmails(contestId: string, emails: string[]): Promise<{ added: number; totalProcessed: number }> {
  const res = await request<unknown>(`/admin/contests/${encodeURIComponent(contestId)}/allowed-emails`, {
    method: "POST",
    body: JSON.stringify({ emails }),
  });
  return unwrapData<{ added: number; totalProcessed: number }>(res);
}

export async function removeAdminAllowedEmail(contestId: string, email: string): Promise<{ success: boolean; email: string }> {
  const res = await request<unknown>(`/admin/contests/${encodeURIComponent(contestId)}/allowed-emails/${encodeURIComponent(email)}`, {
    method: "DELETE",
  });
  return unwrapData<{ success: boolean; email: string }>(res);
}

export async function assignAdminModerator(contestId: string, email: string): Promise<{ success: boolean; user: { id: string; email: string; name: string } }> {
  const res = await request<unknown>(`/admin/contests/${encodeURIComponent(contestId)}/moderators`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
  return unwrapData<{ success: boolean; user: { id: string; email: string; name: string } }>(res);
}

export async function removeAdminModerator(contestId: string, userId: string): Promise<{ success: boolean; demotedToParticipant: boolean }> {
  const res = await request<unknown>(`/admin/contests/${encodeURIComponent(contestId)}/moderators/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
  return unwrapData<{ success: boolean; demotedToParticipant: boolean }>(res);
}

export async function getAdminStats(): Promise<AdminStats> {
  const res = await request<unknown>("/admin/stats");
  return unwrapData<AdminStats>(res);
}
