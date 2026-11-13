"use client";

import { useEffect, useState, useMemo, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/Button";
import { Countdown } from "@/components/Countdown";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Skeleton } from "@/components/Skeleton";
import {
  getContest,
  getMe,
  getProblems,
  getSubmissions,
  getSignInUrl,
  logout,
  postEvent,
  rememberContest,
  ContestDetail,
  CurrentUser,
  ProblemSummary,
  SubmissionSummary,
  ApiRequestError,
} from "@/lib/api";
import {
  getProblemTimeSpent,
  formatTimeSpentBadge,
} from "@/lib/contestTimer";

function formatContestMeta(startsAt: string, endsAt: string): { scheduleStr: string; startTimeStr: string } {
  try {
    const start = new Date(startsAt);
    const end = new Date(endsAt);

    const dateStr = start.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

    const startTimeStr = start.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const endTimeStr = end.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    const tzString =
      Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
        .formatToParts(start)
        .find((p) => p.type === "timeZoneName")?.value || "";

    return {
      scheduleStr: `${dateStr} · ${startTimeStr}–${endTimeStr} ${tzString}`.trim(),
      startTimeStr: `${startTimeStr} ${tzString}`.trim(),
    };
  } catch {
    return {
      scheduleStr: `${startsAt} – ${endsAt}`,
      startTimeStr: startsAt,
    };
  }
}

export default function ContestHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const router = useRouter();

  const [contest, setContest] = useState<ContestDetail | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [problems, setProblems] = useState<ProblemSummary[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const loadControllerRef = useRef<AbortController | null>(null);

  const loadContestData = async () => {
    loadControllerRef.current?.abort();
    const controller = new AbortController();
    loadControllerRef.current = controller;
    try {
      setLoading(true);
      setNotFound(false);
      setGeneralError(null);

      let contestInfo: ContestDetail;
      try {
        contestInfo = await getContest(slug, controller.signal);
        if (controller.signal.aborted) return;
        setContest(contestInfo);
        rememberContest(slug, contestInfo.title);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        if (err instanceof ApiRequestError && err.status === 404) {
          setNotFound(true);
          return;
        }
        throw err;
      }

      try {
        const user = await getMe(slug, controller.signal);
        if (controller.signal.aborted) return;
        setCurrentUser(user);
        const [probList, subs] = await Promise.all([
          getProblems(slug, controller.signal),
          getSubmissions(slug, controller.signal),
        ]);
        if (controller.signal.aborted) return;
        setProblems(probList);
        setSubmissions(subs);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        if (err instanceof ApiRequestError && err.status === 401) {
          setCurrentUser(null);
          setProblems([]);
          setSubmissions([]);
        } else {
          throw err;
        }
      }
    } catch (err: unknown) {
      if (!controller.signal.aborted) {
        setGeneralError(err instanceof Error ? err.message : "Could not load contest.");
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    loadContestData();
    return () => loadControllerRef.current?.abort();
  }, [slug]);

  // Fullscreen tracking
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = Boolean(document.fullscreenElement);
      setIsFullscreen(isFs);
      if (!isFs && contest?.state === "running") {
        postEvent(slug, "fullscreen_exit");
      }
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, [slug, contest?.state]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // Browser restriction
    }
  };

  const handleSignOut = async () => {
    try {
      await logout(slug);
    } catch {
      // Ignored
    }
    setCurrentUser(null);
    loadContestData();
  };

  // Determine problem solve status
  const problemStatusMap = useMemo(() => {
    const map = new Map<string, "solved" | "attempted" | "not_attempted">();

    for (const sub of submissions) {
      const key = sub.problemId;
      const current = map.get(key);
      if (sub.verdict === "accepted") {
        map.set(key, "solved");
      } else if (!current || current === "not_attempted") {
        map.set(key, "attempted");
      }
    }

    return map;
  }, [submissions]);

  const effectiveState = contest?.state ?? "unavailable";

  const { scheduleStr, startTimeStr } = contest?.startsAt && contest?.endsAt
    ? formatContestMeta(contest.startsAt, contest.endsAt)
    : { scheduleStr: "", startTimeStr: "" };

  const scheduleSubtitle = scheduleStr || "Contest status unavailable";

  if (notFound) {
    return (
      <AppShell>
        <ErrorState
          heading="Contest not found"
          message="The requested contest does not exist or may have been deleted."
          onRetry={() => router.push("/")}
        />
      </AppShell>
    );
  }

  if (generalError && !contest) {
    return (
      <AppShell>
        <ErrorState
          heading="Error loading contest"
          message={generalError}
          onRetry={loadContestData}
        />
      </AppShell>
    );
  }

  if (loading || !contest) {
    return (
      <AppShell>
        <div className="space-y-6">
          <Skeleton lines={2} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card><Skeleton lines={3} /></Card>
              <Card><Skeleton lines={5} /></Card>
            </div>
            <div>
              <Card><Skeleton lines={4} /></Card>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      breadcrumbs={[{ label: contest.title }]}
      user={currentUser}
      slug={slug}
    >
      <div className="space-y-6">
        <PageHeader
          title={contest.title}
          subtitle={<span className="font-mono text-xs text-[#8b8b94]">{scheduleSubtitle}</span>}
          actions={
            <StatusBadge
              status={effectiveState}
              labelOverride={effectiveState === "unavailable" ? "Contest status unavailable" : undefined}
            />
          }
        />

        {contest.description && (
          <p className="text-sm text-[#8b8b94] whitespace-pre-wrap">{contest.description}</p>
        )}
        {generalError && (
          <ErrorState message={generalError} onRetry={loadContestData} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <Card accentTop="thick">
              {effectiveState === "running" && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs uppercase font-mono tracking-wider text-emerald-400 font-semibold">
                        Contest is Live & Running
                      </span>
                    </div>

                  </div>

                  {contest.endsAt ? (
                    <div className="flex items-baseline gap-3">
                      <span className="text-xs text-[#8b8b94] uppercase font-mono tracking-wider">
                        Contest Ends In
                      </span>
                      <span className="text-3xl font-mono font-semibold text-[#ededf0]">
                        <Countdown
                          targetTime={contest.endsAt}
                          serverNow={contest.serverNow}
                          onExpire={loadContestData}
                          purpleColons
                        />
                      </span>
                    </div>
                  ) : (
                    <div className="text-2xl font-semibold text-[#ededf0] tracking-tight">
                      Problemset Unlocked
                    </div>
                  )}
                  <p className="text-xs text-[#8b8b94] leading-relaxed">
                    Submit solutions in any problem below. Submissions are tested against Judge0 test cases.
                  </p>
                </div>
              )}

              {effectiveState === "before" && contest.startsAt && (
                <div className="space-y-3">
                  <div className="text-sm text-[#8b8b94]">
                    Problems open at{" "}
                    <span className="font-mono text-[#ededf0]">
                      {startTimeStr}
                    </span>
                    .
                  </div>
                  <div className="text-3xl font-mono font-semibold text-[#ededf0]">
                    <Countdown
                      targetTime={contest.startsAt}
                      serverNow={contest.serverNow}
                      onExpire={loadContestData}
                      purpleColons
                    />
                  </div>
                </div>
              )}

              {effectiveState === "ended" && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <p className="text-sm text-[#8b8b94] leading-relaxed">
                    This contest is not currently active. Official results are on the leaderboard.
                  </p>
                  <Button
                    variant="primary"
                    size="md"
                    href={`/c/${encodeURIComponent(slug)}/leaderboard`}
                    className="shrink-0"
                  >
                    View leaderboard
                  </Button>
                </div>
              )}

              {effectiveState === "unavailable" && (
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-[#ededf0]">
                    Contest status unavailable
                  </div>
                  <p className="text-xs text-[#8b8b94] leading-relaxed">
                    The contest schedule is unavailable. Problems shown below are returned by the server.
                  </p>
                </div>
              )}

              {!currentUser && (
                <div className="space-y-3">
                  <div className="text-xs font-mono uppercase tracking-wider text-[#8b8b94]">
                    Registration Required
                  </div>
                  <div className="text-2xl font-mono text-[#ededf0]">
                    Sign in with Google
                  </div>
                  <p className="text-xs text-[#8b8b94] leading-relaxed">
                    You must be signed in with your allowed email to access this contest.
                  </p>
                  <div className="pt-2">
                    <Button href={getSignInUrl(slug)} variant="primary" size="md">
                      Continue with Google
                    </Button>
                  </div>
                </div>
              )}
            </Card>

            {/* Problem List */}
            {effectiveState === "before" && contest.startsAt ? (
              <Card>
                <EmptyState
                  heading={`Problems open at ${startTimeStr}.`}
                  description="The problemset will unlock automatically when the contest begins."
                />
              </Card>
            ) : !currentUser ? (
              <Card>
                <EmptyState
                  heading="Sign in to see problems."
                  description="You need to be signed in with your registered email to participate."
                  action={
                    <Button href={getSignInUrl(slug)} variant="primary" size="md">
                      Continue with Google
                    </Button>
                  }
                />
              </Card>
            ) : (
              <Card className="p-0 overflow-hidden">
                <div className="p-4 border-b border-[#26262b] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h2 className="text-sm font-semibold text-[#ededf0]">Problems</h2>
                    <span className="text-xs font-mono text-[#8b8b94]">
                      {problems.length} challenge{problems.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>

                {problems.length === 0 ? (
                  <div className="p-8 text-center space-y-4">
                    <div className="w-10 h-10 mx-auto rounded-full bg-[#17171a] border border-[#26262b] flex items-center justify-center text-[#8b8b94]">
                      <svg className="w-5 h-5 text-[#8b8b94]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-[#ededf0]">No problems available</h3>
                      <p className="text-xs text-[#8b8b94] max-w-md mx-auto leading-relaxed">
                        The server has not returned any problems. Refresh to check again.
                      </p>
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-2">
                      <Button variant="secondary" size="sm" onClick={loadContestData}>
                        Check for Problems
                      </Button>
                      <Button variant="outline" size="sm" href={`/c/${encodeURIComponent(slug)}/admin/problems`}>
                        Staff Problem Creator
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="h-10 text-[#8b8b94] border-b border-[#26262b]/60 bg-[#17171a]/30">
                          <th className="px-4 py-2 w-12 font-mono">#</th>
                          <th className="px-4 py-2 font-normal">Title</th>
                          <th className="px-4 py-2 text-right font-mono font-normal">Points</th>
                          <th className="px-4 py-2 text-right font-mono font-normal">Time Spent</th>
                          <th className="px-4 py-2 font-normal">Status</th>
                          <th className="px-4 py-2 text-right font-normal">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#26262b]/40">
                        {problems.map((p) => {
                          const status =
                            problemStatusMap.get(p.id) || "not_attempted";
                          const probUrl = `/c/${encodeURIComponent(slug)}/problems/${encodeURIComponent(p.id)}`;
                          const spentSecs = getProblemTimeSpent(slug, p.id);

                          return (
                            <tr
                              key={p.id}
                              onClick={() => router.push(probUrl)}
                              className="h-[44px] cursor-pointer border-l-2 border-l-transparent hover:border-l-[#6D4AFF] hover:bg-[#17171a] transition-colors"
                            >
                              <td className="px-4 py-2 font-mono font-semibold text-[#ededf0]">
                                {p.letter}
                              </td>
                              <td className="px-4 py-2">
                                <Link
                                  href={probUrl}
                                  className="font-medium text-[#ededf0] hover:text-white transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {p.title}
                                </Link>
                              </td>
                              <td className="px-4 py-2 text-right font-mono text-[#8b8b94]">
                                {p.points}
                              </td>
                              <td className="px-4 py-2 text-right font-mono text-[#a78bfa]">
                                {formatTimeSpentBadge(spentSecs)}
                              </td>
                              <td className="px-4 py-2">
                                <StatusBadge status={status} />
                              </td>
                              <td className="px-4 py-2 text-right">
                                <Link
                                  href={probUrl}
                                  className="text-xs text-[#a78bfa] hover:text-[#c4b5fd] font-medium transition-colors"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  Open →
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            )}

            {/* Rules Card (collapsed by default, expandable) */}
            <Card>
              <button
                type="button"
                onClick={() => setRulesOpen((prev) => !prev)}
                className="w-full flex items-center justify-between text-left text-sm font-semibold text-[#ededf0] hover:text-white transition-colors"
              >
                <span>Contest Rules</span>
                <div className="flex items-center gap-1.5 text-xs text-[#8b8b94] font-mono">
                  <span>{rulesOpen ? "Hide" : "Show"}</span>
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform ${
                      rulesOpen ? "rotate-90 text-[#a78bfa]" : "text-[#5a5a63]"
                    }`}
                  />
                </div>
              </button>

              {rulesOpen && (
                <div className="mt-4 pt-4 border-t border-[#26262b] text-xs text-[#8b8b94] space-y-2 leading-relaxed">
                  <p>• <strong>Solve time:</strong> The timestamp when the server receives your submission.</p>
                  <p>• <strong>Scoring:</strong> Points are awarded only for accepted solutions. There is no penalty for wrong answers.</p>
                  <p>• <strong>Concurrency:</strong> Only one pending submission per participant can be judged at a time across all problems.</p>
                  <p>• <strong>Rate limit:</strong> 10 seconds cooldown between submissions to the same problem.</p>
                  <p>• <strong>Tie breaking:</strong> Ties on the leaderboard are broken by the earliest time of the latest accepted submission.</p>
                  <p>• <strong>Integrity:</strong> Fullscreen mode is requested during the contest; exiting fullscreen is logged.</p>
                </div>
              )}
            </Card>
          </div>

          {/* Side Column (1/3) */}
          <div className="space-y-6">
            {/* Identity Card */}
            {currentUser ? (
              <Card className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[#8b8b94] uppercase tracking-wider">
                    Participant Profile
                  </span>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="text-xs text-[#8b8b94] hover:text-[#ededf0] transition-colors"
                  >
                    Sign out
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6D4AFF] to-[#8B5CF6] text-white flex items-center justify-center font-bold text-base shadow-md ring-2 ring-[#6D4AFF]/20 shrink-0 select-none">
                    {(currentUser.name?.[0] || currentUser.email?.[0] || "P").toUpperCase()}
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-sm font-semibold text-[#ededf0] truncate">
                      {currentUser.name || "Signed in"}
                    </div>
                    <div className="text-xs text-[#8b8b94] truncate">{currentUser.email}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#26262b] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Session Active
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="space-y-3 text-center">
                <h3 className="text-sm font-semibold text-[#ededf0]">
                  Sign in with Google
                </h3>
                <p className="text-xs text-[#8b8b94] leading-relaxed">
                  First-time Google sign-in creates your participant account if
                  that email is on the registration list.
                </p>
                <div className="pt-1">
                  <Button
                    href={getSignInUrl(slug)}
                    variant="primary"
                    size="md"
                    className="w-full"
                  >
                    Continue with Google
                  </Button>
                </div>
              </Card>
            )}

            {/* Quick Links Card */}
            <Card className="space-y-2">
              <div className="text-xs font-mono text-[#8b8b94] uppercase tracking-wider mb-2">
                Navigation
              </div>
              <div className="flex flex-col space-y-1 text-xs">
                <Link
                  href={`/c/${encodeURIComponent(slug)}`}
                  className="px-2.5 py-1.5 rounded-md bg-[#17171a] text-[#ededf0] font-medium"
                >
                  Problems
                </Link>
                <Link
                  href={`/c/${encodeURIComponent(slug)}/leaderboard`}
                  className="px-2.5 py-1.5 rounded-md text-[#8b8b94] hover:text-[#ededf0] hover:bg-[#17171a] transition-colors"
                >
                  Leaderboard
                </Link>
                <Link
                  href={`/c/${encodeURIComponent(slug)}/submissions`}
                  className="px-2.5 py-1.5 rounded-md text-[#8b8b94] hover:text-[#ededf0] hover:bg-[#17171a] transition-colors"
                >
                  My submissions
                </Link>
                <Link
                  href={`/c/${encodeURIComponent(slug)}/moderator/problems`}
                  className="px-2.5 py-1.5 rounded-md text-[#8b8b94] hover:text-[#ededf0] hover:bg-[#17171a] transition-colors"
                >
                  Staff / Moderator
                </Link>
              </div>
            </Card>

            {/* Fullscreen Card (running only) */}
            {contest.state === "running" && (
              <Card className="space-y-2">
                <Button
                  variant="outline"
                  size="md"
                  onClick={toggleFullscreen}
                  className="w-full"
                >
                  {isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                </Button>
              </Card>
            )}

          </div>
        </div>
      </div>
    </AppShell>
  );
}
