"use client";

import { useEffect, useState, useMemo, useRef, use } from "react";
import Link from "next/link";
import Editor from "@monaco-editor/react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { DataTable, Column } from "@/components/DataTable";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { Skeleton } from "@/components/Skeleton";
import {
  getContest,
  getMe,
  getSubmissions,
  getSubmission,
  getSignInUrl,
  rememberContest,
  ContestDetail,
  CurrentUser,
  SubmissionSummary,
  SubmissionDetail,
  ApiRequestError,
} from "@/lib/api";
import { waitForSubmission } from "@/lib/submissionPolling";

type FilterTab = "all" | "accepted" | "rejected" | "pending";

export default function SubmissionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [contest, setContest] = useState<ContestDetail | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionSummary[]>([]);
  const [filter, setFilter] = useState<FilterTab>("all");
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUnauthorized, setIsUnauthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingMessage, setPollingMessage] = useState<string | null>(null);
  const [pollRun, setPollRun] = useState(0);
  const listControllerRef = useRef<AbortController | null>(null);

  // Detail Drawer State
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<SubmissionDetail | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailRun, setDetailRun] = useState(0);

  const fetchList = async (isInitial = false) => {
    listControllerRef.current?.abort();
    const controller = new AbortController();
    listControllerRef.current = controller;
    try {
      if (isInitial) setLoading(true);
      else setIsUpdating(true);
      setError(null);
      setIsUnauthorized(false);
      setPollingMessage(null);

      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]);
      const [contestData, userData, list] = await Promise.all([
        getContest(slug, signal),
        getMe(slug, signal),
        getSubmissions(slug, signal),
      ]);

      if (controller.signal.aborted) return;
      setContest(contestData);
      setCurrentUser(userData);
      setSubmissions(list);
      rememberContest(slug, contestData.title);
      setPollRun((run) => run + 1);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      if (err instanceof ApiRequestError && err.status === 401) {
        setIsUnauthorized(true);
        setCurrentUser(null);
        setSubmissions([]);
        setSelectedSubmissionId(null);
      } else {
        setError(err instanceof Error ? err.message : "Could not load submissions.");
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setIsUpdating(false);
      }
    }
  };

  useEffect(() => {
    setSubmissions([]);
    setCurrentUser(null);
    setContest(null);
    setSelectedSubmissionId(null);
    fetchList(true);
    return () => listControllerRef.current?.abort();
  }, [slug]);

  const pendingId = submissions.find((submission) => submission.status !== "done")?.id;

  useEffect(() => {
    if (!pendingId) {
      setIsPolling(false);
      return;
    }
    const controller = new AbortController();
    setIsPolling(true);
    setPollingMessage(null);

    void waitForSubmission({
      slug,
      id: pendingId,
      signal: controller.signal,
      onUpdate: (submission) => {
        if (controller.signal.aborted) return;
        setPollingMessage(null);
        setSubmissions((rows) => rows.map((row) => row.id === submission.id ? submission : row));
        setSelectedDetail((detail) => detail?.id === submission.id ? submission : detail);
      },
      onRetry: () => setPollingMessage("Connection interrupted. Retrying your saved submission…"),
    }).then((result) => {
      if (controller.signal.aborted) return;
      setIsPolling(false);
      if (result === "timeout") {
        setPollingMessage("Still pending. Automatic checks stopped after 3 minutes. Refresh to check again.");
      }
    }).catch((err: unknown) => {
      if (controller.signal.aborted) return;
      setIsPolling(false);
      setPollingMessage(err instanceof Error ? err.message : "Could not check the submission.");
      if (err instanceof ApiRequestError && err.status === 401) {
        setIsUnauthorized(true);
        setCurrentUser(null);
        setSubmissions([]);
        setSelectedSubmissionId(null);
      }
    });

    return () => controller.abort();
  }, [slug, pendingId, pollRun]);

  const openDetail = (sub: SubmissionSummary) => {
    setSelectedSubmissionId(sub.id);
    setCopiedCode(false);
  };

  useEffect(() => {
    if (!selectedSubmissionId) return;
    const controller = new AbortController();
    setSelectedDetail(null);
    setDetailLoading(true);
    setDetailError(null);
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]);

    void getSubmission(slug, selectedSubmissionId, signal).then((detail) => {
      if (!controller.signal.aborted) setSelectedDetail(detail);
    }).catch((err: unknown) => {
      if (!controller.signal.aborted) {
        setDetailError(err instanceof Error ? err.message : "Could not load the submission.");
      }
    }).finally(() => {
      if (!controller.signal.aborted) setDetailLoading(false);
    });

    return () => controller.abort();
  }, [slug, selectedSubmissionId, detailRun]);

  const closeDetail = () => {
    setSelectedSubmissionId(null);
    setSelectedDetail(null);
  };

  const handleCopyCode = async () => {
    if (!selectedDetail?.code) return;
    try {
      await navigator.clipboard.writeText(selectedDetail.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Ignored
    }
  };

  // Filter client-side
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((s) => {
      if (filter === "accepted") return s.verdict === "accepted";
      if (filter === "rejected") {
        return (
          s.verdict === "wrong_answer" ||
          s.verdict === "tle" ||
          s.verdict === "runtime_error" ||
          s.verdict === "compile_error"
        );
      }
      if (filter === "pending") {
        return s.status === "queued" || s.status === "judging";
      }
      return true;
    });
  }, [submissions, filter]);

  const columns: Column<SubmissionSummary>[] = [
    {
      key: "clickedAt",
      header: "Time",
      width: "120px",
      className: "font-mono text-[#8b8b94]",
      render: (row) => {
        try {
          return new Date(row.clickedAt).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false,
          });
        } catch {
          return row.clickedAt;
        }
      },
    },
    {
      key: "problem",
      header: "Problem",
      render: (row) => (
        <span className="font-medium text-[#ededf0]">
          {row.problemLetter ? `${row.problemLetter}. ` : ""}
          {row.problemTitle || `Problem ${row.problemId}`}
        </span>
      ),
    },
    {
      key: "language",
      header: "Language",
      width: "110px",
      className: "font-mono text-[#8b8b94] capitalize",
      render: (row) => row.language,
    },
    {
      key: "verdict",
      header: "Verdict",
      width: "160px",
      render: (row) => (
        <StatusBadge status={row.status === "done" ? row.verdict || "done" : row.status} />
      ),
    },
    {
      key: "points",
      header: "Points",
      width: "80px",
      align: "right",
      className: "font-mono text-right font-semibold text-[#ededf0]",
      render: (row) => (row.verdict === "accepted" ? row.points : 0),
    },
  ];

  return (
    <AppShell
      breadcrumbs={[
        { label: contest?.title || "Contest", href: `/c/${encodeURIComponent(slug)}` },
        { label: "My submissions" },
      ]}
      user={currentUser}
      slug={slug}
    >
      <div className="space-y-6">
        <PageHeader
          title="My submissions"
          subtitle="Your submissions for this contest, saved on the server."
          actions={
            <div className="flex items-center gap-4">
              {(isUpdating || isPolling) && (
                <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[#8b8b94]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6D4AFF] animate-pulse" />
                  <span>Updating…</span>
                </span>
              )}
              <Button variant="secondary" size="sm" disabled={isUpdating || loading} onClick={() => fetchList()}>
                Refresh
              </Button>

              {/* Segmented Filter Control */}
              <div className="flex items-center p-0.5 rounded-lg bg-[#111113] border border-[#26262b] text-xs">
                {(
                  [
                    { id: "all", label: "All" },
                    { id: "accepted", label: "Accepted" },
                    { id: "rejected", label: "Rejected" },
                    { id: "pending", label: "Pending" },
                  ] as { id: FilterTab; label: string }[]
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilter(tab.id)}
                    className={`px-3 py-1 rounded-md transition-colors text-xs ${
                      filter === tab.id
                        ? "bg-[#6D4AFF]/15 text-[#a78bfa] border border-[#6D4AFF]/30 font-medium"
                        : "text-[#8b8b94] hover:text-[#ededf0] border border-transparent"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          }
        />

        {pollingMessage && <p role="status" className="text-xs text-[#8b8b94]">{pollingMessage}</p>}
        {error && submissions.length > 0 && (
          <ErrorState message={error} onRetry={() => fetchList()} />
        )}

        {loading ? (
          <Card>
            <Skeleton lines={6} />
          </Card>
        ) : isUnauthorized ? (
          <Card>
            <EmptyState
              heading="Sign in to view your submissions"
              description="You must be signed in to see your submitted solutions."
              action={
                <Button href={getSignInUrl(slug)} variant="primary" size="md">
                  Continue with Google
                </Button>
              }
            />
          </Card>
        ) : error && submissions.length === 0 ? (
          <ErrorState message={error} onRetry={() => fetchList(true)} />
        ) : (
          <Card className="p-0 overflow-hidden">
            <div className="max-h-[550px] overflow-y-auto">
              <DataTable
                columns={columns}
                data={filteredSubmissions}
                keyExtractor={(row) => row.id}
                onRowClick={openDetail}
                emptyState={
                  <EmptyState
                    heading={submissions.length === 0 ? "No submissions yet." : "No submissions match this filter."}
                    description="Solutions you submit for this contest will appear here."
                    action={
                      <Button href={`/c/${encodeURIComponent(slug)}`} variant="primary" size="md">
                        Go to problems
                      </Button>
                    }
                  />
                }
              />
            </div>
          </Card>
        )}
      </div>

      {/* Right-Side Drawer for Submission Details */}
      {selectedSubmissionId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={closeDetail}
          />

          {/* Drawer Body */}
          <div className="relative w-full max-w-xl h-full bg-[#111113] border-l border-[#26262b] border-t-2 border-t-[#6D4AFF] p-6 flex flex-col gap-5 shadow-2xl z-10 overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#26262b]">
              <div>
                <span className="text-xs font-mono text-[#8b8b94] block">
                  Submission ID
                </span>
                <span className="font-mono text-base font-semibold text-[#ededf0]">
                  {selectedSubmissionId}
                </span>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="text-[#8b8b94] hover:text-[#ededf0] p-1 rounded-md hover:bg-[#17171a] transition-colors"
              >
                ✕
              </button>
            </div>

            {detailError ? (
              <ErrorState message={detailError} onRetry={() => setDetailRun((run) => run + 1)} />
            ) : detailLoading || !selectedDetail ? (
              <div className="space-y-4">
                <Skeleton lines={4} />
              </div>
            ) : (
              <div className="space-y-5 flex-1 flex flex-col">
                {/* Meta details grid */}
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-[#8b8b94] block mb-0.5">Problem</span>
                    <span className="text-[#ededf0] font-sans font-medium">
                      {selectedDetail.problemLetter ? `${selectedDetail.problemLetter}. ` : ""}
                      {selectedDetail.problemTitle}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#8b8b94] block mb-0.5">Verdict</span>
                    <StatusBadge
                      status={
                        selectedDetail.status === "done"
                          ? selectedDetail.verdict || "done"
                          : selectedDetail.status
                      }
                    />
                  </div>

                  <div>
                    <span className="text-[#8b8b94] block mb-0.5">Submitted</span>
                    <span className="text-[#ededf0]">
                      {new Date(selectedDetail.clickedAt).toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <span className="text-[#8b8b94] block mb-0.5">Judged</span>
                    <span className="text-[#ededf0]">
                      {selectedDetail.judgedAt
                        ? new Date(selectedDetail.judgedAt).toLocaleString()
                        : "Pending"}
                    </span>
                  </div>
                </div>

                {/* Judge error specific message */}
                {selectedDetail.verdict === "judge_error" && (
                  <div className="p-3 rounded-md border border-dashed border-zinc-600 text-xs text-[#8b8b94]">
                    The judge could not complete this submission. Your code is saved; contact the organisers.
                  </div>
                )}

                {/* Compile output if compile_error */}
                {selectedDetail.verdict === "compile_error" && selectedDetail.compileOutput && (
                  <div>
                    <span className="text-xs font-mono text-[#8b8b94] block mb-1">
                      Compile Output
                    </span>
                    <pre className="p-3 rounded-md bg-[#0a0a0b] border border-rose-500/20 text-rose-300 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-40">
                      {selectedDetail.compileOutput}
                    </pre>
                  </div>
                )}

                {/* Source Code Section */}
                <div className="flex-1 flex flex-col min-h-[300px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-[#8b8b94]">
                      Source Code ({selectedDetail.language})
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyCode}
                      className="text-[#a78bfa] hover:text-white"
                    >
                      {copiedCode ? "Copied" : "Copy code"}
                    </Button>
                  </div>

                  <div className="flex-1 min-h-[260px] rounded-md overflow-hidden border border-[#26262b] bg-[#0a0a0b]">
                    <Editor
                      height="100%"
                      language={selectedDetail.language === "c" || selectedDetail.language === "cpp" ? "cpp" : selectedDetail.language}
                      theme="vs-dark"
                      value={selectedDetail.code}
                      options={{
                        readOnly: true,
                        fontSize: 13,
                        minimap: { enabled: false },
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        wordWrap: "on",
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
