"use client";

import { useEffect, useState, useRef, use } from "react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { DataTable, Column } from "@/components/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Skeleton } from "@/components/Skeleton";
import { Button } from "@/components/Button";
import {
  getContest,
  getMe,
  getLeaderboard,
  getSignInUrl,
  rememberContest,
  LeaderboardEntry,
  ContestDetail,
  CurrentUser,
  ApiRequestError,
} from "@/lib/api";

export default function LeaderboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [contest, setContest] = useState<ContestDetail | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [published, setPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [secondsAgo, setSecondsAgo] = useState(0);
  const lastFetchTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchBoard = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      setError(null);
      setIsUnauthorized(false);

      rememberContest(slug);

      const [boardRes, contestRes, meRes] = await Promise.all([
        getLeaderboard(slug),
        contest ? Promise.resolve(contest) : getContest(slug).catch(() => null),
        currentUser ? Promise.resolve(currentUser) : getMe(slug).catch(() => null),
      ]);

      setEntries(boardRes.data || []);
      setPublished(boardRes.published);
      if (contestRes) setContest(contestRes);
      if (meRes) setCurrentUser(meRes);

      lastFetchTimeRef.current = Date.now();
      setSecondsAgo(0);
    } catch (err: any) {
      if (err instanceof ApiRequestError && err.status === 401) {
        setIsUnauthorized(true);
      } else if (isInitial) {
        setError(err?.message || "Failed to load leaderboard.");
      }
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard(true);

    // Polling interval (15s) while tab is visible
    timerRef.current = setInterval(() => {
      const diff = Math.floor((Date.now() - lastFetchTimeRef.current) / 1000);
      setSecondsAgo(diff);

      if (document.visibilityState === "visible" && diff >= 15) {
        fetchBoard(false);
      }
    }, 1000);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        fetchBoard(false);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [slug]);

  const columns: Column<LeaderboardEntry>[] = [
    {
      key: "rank",
      header: "Rank",
      width: "80px",
      align: "left",
      className: "font-mono font-medium",
      render: (row) => {
        let dotColor: string | null = null;
        if (row.rank === 1) dotColor = "bg-[#fbbf24]"; // gold
        else if (row.rank === 2) dotColor = "bg-[#94a3b8]"; // silver
        else if (row.rank === 3) dotColor = "bg-[#cd7f32]"; // bronze

        return (
          <div className="flex items-center gap-2">
            {dotColor && <span className={`w-2 h-2 rounded-full ${dotColor}`} />}
            <span>{row.rank}</span>
          </div>
        );
      },
    },
    {
      key: "name",
      header: "Name",
      render: (row) => {
        const isYou =
          Boolean(currentUser?.name) &&
          currentUser?.name !== "Signed in" &&
          row.name.toLowerCase() === currentUser?.name?.toLowerCase();
        return (
          <div className="flex items-center gap-2">
            <span className={`font-medium ${isYou ? "text-[#a78bfa]" : "text-[#ededf0]"}`}>
              {row.name}
            </span>
            {isYou && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#6D4AFF]/20 text-[#a78bfa] border border-[#6D4AFF]/30">
                You
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "total",
      header: "Total points",
      align: "right",
      className: "font-mono font-semibold text-right text-[#ededf0]",
      render: (row) => row.total,
    },
    {
      key: "lastSolveAt",
      header: "Last accepted",
      align: "right",
      className: "font-mono text-right text-[#8b8b94]",
      render: (row) => {
        try {
          return new Date(row.lastSolveAt).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          });
        } catch {
          return row.lastSolveAt;
        }
      },
    },
  ];

  return (
    <AppShell
      breadcrumbs={[
        { label: contest?.title || "Contest", href: `/c/${encodeURIComponent(slug)}` },
        { label: "Leaderboard" },
      ]}
      user={currentUser}
      slug={slug}
    >
      <div className="space-y-6">
        <PageHeader
          title="Leaderboard"
          subtitle={
            published ? (
              "Official standings."
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6D4AFF]" />
                <span>Live during the contest.</span>
              </span>
            )
          }
          actions={
            <span className="font-mono text-xs text-[#5a5a63]">
              Updated {secondsAgo}s ago
            </span>
          }
        />

        {loading ? (
          <Card>
            <Skeleton lines={8} />
          </Card>
        ) : isUnauthorized ? (
          <Card>
            <EmptyState
              heading="Sign in to view live leaderboard"
              description="Contest standings require you to be signed in as a participant."
              action={
                <Button href={getSignInUrl(slug)} variant="primary" size="md">
                  Continue with Google
                </Button>
              }
            />
          </Card>
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchBoard(true)} />
        ) : (
          <div className="space-y-3">
            <Card className="p-0 overflow-hidden">
              <div className="max-h-[550px] overflow-y-auto">
                <DataTable
                  columns={columns}
                  data={entries}
                  keyExtractor={(row) => `${row.rank}-${row.name}`}
                  headerClassName="border-b border-[#6D4AFF]/30"
                  rowClassName={(row) => {
                    const isYou =
                      Boolean(currentUser?.name) &&
                      currentUser?.name !== "Signed in" &&
                      row.name.toLowerCase() === currentUser?.name?.toLowerCase();
                    return isYou ? "bg-[#6D4AFF]/10 border-l-2 border-l-[#6D4AFF]" : "";
                  }}
                  emptyState={
                    <EmptyState
                      heading="No accepted solutions yet."
                      description="Leaderboard standings will populate as participants solve problems."
                    />
                  }
                />
              </div>
            </Card>

            {!published && (
              <p className="text-xs text-[#5a5a63] font-mono text-center pt-2">
                Official standings are published after review.
              </p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
