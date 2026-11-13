"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/Card";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/Button";
import { ErrorState } from "@/components/ErrorState";
import { Skeleton } from "@/components/Skeleton";
import { Countdown } from "@/components/Countdown";
import { useToast } from "@/components/Toast";
import {
  getContest,
  getMe,
  getProblem,
  getProblems,
  getSubmissions,
  getSubmission,
  submitSolution,
  runSampleCode,
  RunCodeResponse,
  postEvent,
  rememberContest,
  ContestDetail,
  CurrentUser,
  ProblemDetail,
  ProblemSummary,
  SubmissionSummary,
  SubmissionDetail,
  ApiRequestError,
} from "@/lib/api";
import { waitForSubmission } from "@/lib/submissionPolling";
import {
  getProblemTimeSpent,
  addProblemTimeSpent,
  formatDuration,
} from "@/lib/contestTimer";

type SupportedLanguage = "c" | "cpp" | "java" | "javascript" | "python";

const LANGUAGE_LIMITS: Record<SupportedLanguage, { time: string; memory: string }> = {
  c: { time: "1s", memory: "256 MB" },
  cpp: { time: "1s", memory: "256 MB" },
  java: { time: "2s", memory: "256 MB" },
  javascript: { time: "2s", memory: "256 MB" },
  python: { time: "3s", memory: "256 MB" },
};

const LANGUAGE_MAP: Record<SupportedLanguage, { label: string; monacoLang: string; starter: string }> = {
  c: {
    label: "C (gcc)",
    monacoLang: "c",
    starter: "#include <stdio.h>\n\nint main(void) {\n    // Solution\n    return 0;\n}\n",
  },
  cpp: {
    label: "C++17",
    monacoLang: "cpp",
    starter: "#include <iostream>\n\nusing namespace std;\n\nint main() {\n    ios::sync_with_stdio(false);\n    cin.tie(nullptr);\n    // Solution\n    return 0;\n}\n",
  },
  java: {
    label: "Java",
    monacoLang: "java",
    starter: "import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        // Solution\n    }\n}\n",
  },
  javascript: {
    label: "JavaScript (Node)",
    monacoLang: "javascript",
    starter: "const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\n// Solution\n",
  },
  python: {
    label: "Python 3",
    monacoLang: "python",
    starter: "import sys\n\ndef main():\n    # Solution\n    pass\n\nif __name__ == '__main__':\n    main()\n",
  },
};

export default function ProblemPage({
  params,
}: {
  params: Promise<{ slug: string; problemId: string }>;
}) {
  const resolvedParams = use(params);
  const { slug, problemId } = resolvedParams;
  const router = useRouter();
  const { showToast } = useToast();

  const [contest, setContest] = useState<ContestDetail | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [allProblems, setAllProblems] = useState<ProblemSummary[]>([]);
  const [solvedProblemIds, setSolvedProblemIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editor and draft state
  const [language, setLanguage] = useState<SupportedLanguage>("cpp");
  const [code, setCode] = useState<string>("");
  const [draftStatus, setDraftStatus] = useState<"Draft saved" | "Saving…" | "Restored your saved draft">("Draft saved");
  const [codeSizeWarning, setCodeSizeWarning] = useState<string | null>(null);

  // Submission & Result state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionState, setSubmissionState] = useState<
    "idle" | "submitting" | "queued" | "judging" | "verdict" | "rate_limited"
  >("idle");
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [pollingMessage, setPollingMessage] = useState<string | null>(null);
  const [latestVerdict, setLatestVerdict] = useState<string | null>(null);
  const [pointsEarned, setPointsEarned] = useState<number | null>(null);
  const [judgedAtTime, setJudgedAtTime] = useState<string | null>(null);
  const [compileOutput, setCompileOutput] = useState<string | null>(null);
  const [rateLimitSeconds, setRateLimitSeconds] = useState<number>(0);
  const [pendingElsewhere, setPendingElsewhere] = useState<{ id: string; problemId: string; letter: string } | null>(null);
  const [elsewhereMessage, setElsewhereMessage] = useState<string | null>(null);
  const [elsewherePollRun, setElsewherePollRun] = useState(0);

  // Submissions sidebar & tabs for this problem
  const [problemSubmissions, setProblemSubmissions] = useState<SubmissionSummary[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"statement" | "submissions">("statement");
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);

  // Time tracking
  const [problemSeconds, setProblemSeconds] = useState(0);

  // Run Code (Test Sample Cases) state
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [runResult, setRunResult] = useState<RunCodeResponse | null>(null);
  const [activeTestTab, setActiveTestTab] = useState<number>(0);
  const [bottomTab, setBottomTab] = useState<"result" | "testcases">("result");

  const editorRef = useRef<any>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollControllerRef = useRef<AbortController | null>(null);
  const loadControllerRef = useRef<AbortController | null>(null);
  const loadedCodeRef = useRef<string | null>(null);

  const draftKey = `podium:draft:${slug}:${problemId}:${language}`;

  // 1. Initial Data Load
  const loadData = async () => {
    loadControllerRef.current?.abort();
    stopPolling();
    const controller = new AbortController();
    loadControllerRef.current = controller;
    try {
      setLoading(true);
      setError(null);
      setNotFound(false);
      setProblem(null);
      setCurrentUser(null);
      setProblemSubmissions([]);
      setSolvedProblemIds(new Set());
      setHistoryError(null);
      setSubmissionState("idle");
      setIsSubmitting(false);
      setActiveSubmissionId(null);
      setLatestVerdict(null);
      setPointsEarned(null);
      setCompileOutput(null);
      setPollingMessage(null);
      setIsPolling(false);
      setPendingElsewhere(null);

      const [contestData, problemList, me] = await Promise.all([
        getContest(slug, controller.signal),
        getProblems(slug, controller.signal),
        getMe(slug, controller.signal),
      ]);

      if (controller.signal.aborted) return;
      setContest(contestData);
      setAllProblems(problemList);
      setCurrentUser(me);
      rememberContest(slug, contestData.title);

      let currentProblem: ProblemDetail | null = null;
      try {
        currentProblem = await getProblem(slug, problemId, controller.signal);
        if (controller.signal.aborted) return;
        setProblem(currentProblem);
      } catch (err: any) {
        if (err instanceof ApiRequestError && err.status === 404) {
          setNotFound(true);
          return;
        }
        throw err;
      }

      try {
        const subs = await getSubmissions(slug, controller.signal);
        if (controller.signal.aborted) return;
        const solved = new Set(
          subs
            .filter((s) => s.verdict === "accepted")
            .map((s) => s.problemId)
        );
        setSolvedProblemIds(solved);
        const thisProbSubs = subs.filter(
          (s) => s.problemId === currentProblem?.id
        );
        setProblemSubmissions(thisProbSubs);
        const pending = subs.find((s) => s.status === "queued" || s.status === "judging");
        if (pending && pending.problemId !== currentProblem?.id) {
          setPendingElsewhere({ id: pending.id, problemId: pending.problemId, letter: pending.problemLetter });
        }
        const latest = thisProbSubs[0];
        if (latest) {
          setSubmissionState(latest.status === "done" ? "verdict" : latest.status);
          setLatestVerdict(latest.status === "done" ? latest.verdict : null);
          setPointsEarned(latest.status === "done" ? latest.points : null);
          startPolling(latest.id);
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        setHistoryError(err instanceof Error ? err.message : "Could not load submission history.");
      }
    } catch (err: any) {
      if (controller.signal.aborted) return;
      if (err instanceof ApiRequestError && err.status === 401) {
        router.push(`/c/${encodeURIComponent(slug)}`);
        return;
      }
      setError(err?.message || "Failed to load problem.");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    return () => {
      loadControllerRef.current?.abort();
      stopPolling();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [slug, problemId]);

  // Track time spent on this problem on this device, separately from contest timing.
  useEffect(() => {
    setProblemSeconds(getProblemTimeSpent(slug, problemId));
    const timer = setInterval(() => {
      const updatedProblem = addProblemTimeSpent(slug, problemId, 1);
      setProblemSeconds(updatedProblem);
    }, 1000);

    return () => clearInterval(timer);
  }, [slug, problemId]);

  // 2. Draft Restoration on Problem or Language change
  useEffect(() => {
    if (loadedCodeRef.current !== null) {
      const source = loadedCodeRef.current;
      loadedCodeRef.current = null;
      setCode(source);
      persistDraft(source);
      return;
    }
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved && saved.trim().length > 0) {
        setCode(saved);
        setDraftStatus("Restored your saved draft");
        setTimeout(() => setDraftStatus("Draft saved"), 3000);
      } else {
        const defaultCode = (problem?.starterCode && problem.starterCode[language]) || LANGUAGE_MAP[language].starter;
        setCode(defaultCode);
        setDraftStatus("Draft saved");
      }
    } catch {
      setCode((problem?.starterCode && problem.starterCode[language]) || LANGUAGE_MAP[language].starter);
    }
  }, [draftKey, language, problem?.starterCode]);

  // 3. Draft saving logic (debounced 300ms)
  const persistDraft = (value: string) => {
    try {
      localStorage.setItem(draftKey, value);
      setDraftStatus("Draft saved");
    } catch {
      // Storage quota
    }
  };

  const handleCodeChange = (val: string | undefined) => {
    const value = val || "";
    setCode(value);
    setDraftStatus("Saving…");

    // Size checks
    const sizeBytes = new Blob([value]).size;
    if (sizeBytes > 64 * 1024) {
      setCodeSizeWarning("Code is larger than 64 KB.");
    } else if (sizeBytes > 60 * 1024) {
      setCodeSizeWarning("Large code, approaching the 64 KB limit.");
    } else {
      setCodeSizeWarning(null);
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      persistDraft(value);
    }, 300);
  };

  // Visibility and blur persistence
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        persistDraft(code);
        postEvent(slug, "visibility_hidden");
      }
    };
    window.addEventListener("visibilitychange", onVisibility);
    return () => window.removeEventListener("visibilitychange", onVisibility);
  }, [code, draftKey, slug]);

  // Rate limit countdown timer
  useEffect(() => {
    if (rateLimitSeconds <= 0) return;
    const interval = setInterval(() => {
      setRateLimitSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setSubmissionState("idle");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimitSeconds]);

  // Monaco editor mount and paste blocker
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Custom theme with purple cursor
    try {
      monaco.editor.defineTheme("podium-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [],
        colors: {
          "editorCursor.foreground": "#6D4AFF",
        },
      });
      monaco.editor.setTheme("podium-dark");
    } catch {
      // Fallback to default
    }

    // Intercept paste attempts at the DOM level of the editor container
    const domNode = editor.getDomNode();
    if (domNode) {
      domNode.addEventListener(
        "paste",
        (e: ClipboardEvent) => {
          e.preventDefault();
          e.stopPropagation();
          // Silently report to events endpoint per spec
          postEvent(slug, "paste_blocked");
        },
        true
      );
    }
  };

  const refreshProblemSubmissions = async () => {
    const scope = loadControllerRef.current;
    try {
      const subs = await getSubmissions(slug, scope?.signal);
      if (scope?.signal.aborted) return;
      setHistoryError(null);
      setProblemSubmissions(subs.filter((s) => s.problemId === problem?.id));
      setExpandedSubId(null);
      const pending = subs.find((s) => s.status !== "done");
      if (pending && pending.problemId === problem?.id) startPolling(pending.id);
      setPendingElsewhere(pending && pending.problemId !== problem?.id
        ? { id: pending.id, problemId: pending.problemId, letter: pending.problemLetter }
        : null);
    } catch (err: unknown) {
      if (scope?.signal.aborted) return;
      const message = err instanceof Error ? err.message : "Could not refresh submissions.";
      setHistoryError(message);
      showToast(message, "error");
    }
  };

  const refreshContest = async () => {
    const scope = loadControllerRef.current;
    try {
      const updated = await getContest(slug, scope?.signal);
      if (scope?.signal.aborted) return;
      setContest(updated);
      setError(null);
    } catch (err: unknown) {
      if (scope?.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Could not refresh contest status.");
    }
  };

  const stopPolling = () => {
    pollControllerRef.current?.abort();
    pollControllerRef.current = null;
  };

  const applySubmissionResult = (submission: SubmissionDetail) => {
    setSubmissionState(submission.status === "done" ? "verdict" : submission.status);
    setLatestVerdict(submission.status === "done" ? submission.verdict : null);
    setPointsEarned(submission.status === "done" ? submission.points : null);
    setJudgedAtTime(submission.judgedAt ? new Date(submission.judgedAt).toLocaleTimeString() : null);
    setCompileOutput(submission.verdict === "compile_error" ? submission.compileOutput ?? null : null);
    setProblemSubmissions((rows) => [submission, ...rows.filter((row) => row.id !== submission.id)]);

    if (submission.verdict === "accepted") {
      setSolvedProblemIds((ids) => new Set([...ids, submission.problemId]));
    }
  };

  const startPolling = (id: string) => {
    stopPolling();
    const controller = new AbortController();
    pollControllerRef.current = controller;
    setActiveSubmissionId(id);
    setIsPolling(true);
    setPollingMessage(null);

    void waitForSubmission({
      slug,
      id,
      signal: controller.signal,
      onUpdate: (submission) => {
        if (controller.signal.aborted) return;
        setPollingMessage(null);
        applySubmissionResult(submission);
      },
      onRetry: () => setPollingMessage("Connection interrupted. Retrying your saved submission…"),
    }).then((result) => {
      if (controller.signal.aborted) return;
      setIsPolling(false);
      if (result === "timeout") {
        setPollingMessage("Still pending. Automatic checks stopped after 3 minutes. Check again or open My submissions.");
      }
    }).catch((error: unknown) => {
      if (controller.signal.aborted) return;
      setIsPolling(false);
      setPollingMessage(error instanceof Error ? error.message : "Could not check this submission.");
      if (error instanceof ApiRequestError && error.status === 401) {
        router.push(`/c/${encodeURIComponent(slug)}`);
      }
    });
  };

  const loadSubmissionCode = async (submission: SubmissionSummary, intoEditor: boolean) => {
    const scope = loadControllerRef.current;
    try {
      const detail = await getSubmission(slug, submission.id, scope?.signal);
      if (scope?.signal.aborted) return;
      setProblemSubmissions((rows) => rows.map((row) => row.id === detail.id ? detail : row));
      if (intoEditor) {
        if (language !== detail.language) loadedCodeRef.current = detail.code;
        else persistDraft(detail.code);
        setCode(detail.code);
        setLanguage(detail.language as SupportedLanguage);
        setCodeSizeWarning(null);
      } else {
        setExpandedSubId(expandedSubId === detail.id ? null : detail.id);
      }
    } catch (error) {
      if (scope?.signal.aborted) return;
      showToast(error instanceof Error ? error.message : "Could not load submission code.", "error");
    }
  };

  useEffect(() => {
    if (!pendingElsewhere) return;
    const controller = new AbortController();
    setElsewhereMessage(null);
    void waitForSubmission({
      slug,
      id: pendingElsewhere.id,
      signal: controller.signal,
      onUpdate: (submission) => {
        if (!controller.signal.aborted && submission.status === "done") setPendingElsewhere(null);
      },
      onRetry: () => setElsewhereMessage("Connection interrupted. Retrying…"),
    }).then((result) => {
      if (!controller.signal.aborted && result === "timeout") {
        setElsewhereMessage("Still pending. Automatic checks stopped after 3 minutes.");
      }
    }).catch((err: unknown) => {
      if (!controller.signal.aborted) {
        setElsewhereMessage(err instanceof Error ? err.message : "Could not check the pending submission.");
      }
    });
    return () => controller.abort();
  }, [slug, pendingElsewhere?.id, elsewherePollRun]);

  // Submit Handler
  const handleSubmit = async () => {
    if (!problem || contest?.state !== "running" || isSubmitting || isPolling || rateLimitSeconds > 0 || pendingElsewhere) return;
    const scope = loadControllerRef.current;

    // Check size limit
    const sizeBytes = new Blob([code]).size;
    if (sizeBytes > 64 * 1024) {
      showToast("Code is larger than 64 KB.", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmissionState("submitting");
      setLatestVerdict(null);
      setPointsEarned(null);
      setJudgedAtTime(null);
      setCompileOutput(null);

      const res = await submitSolution(slug, problem.id, {
        language,
        code,
      });

      if (scope?.signal.aborted) return;
      setActiveSubmissionId(res.id);
      setSubmissionState(res.status === "done" ? "verdict" : res.status);
      setLatestVerdict(res.status === "done" ? res.verdict ?? null : null);
      setIsSubmitting(false);

      showToast("Submission received. Checking its status…", "info");
      startPolling(res.id);
    } catch (err: any) {
      if (scope?.signal.aborted) return;
      setIsSubmitting(false);

      if (err instanceof ApiRequestError) {
        if (err.status === 401) {
          router.push(`/c/${encodeURIComponent(slug)}`);
          return;
        }

        if (err.status === 403) {
          showToast(err.message, "error");
          setSubmissionState("idle");
          return;
        }

        if (err.status === 429) {
          const msg = err.message || "";
          const match = msg.match(/(\d+)\s*second/i);
          const seconds = match ? parseInt(match[1], 10) : 10;
          setRateLimitSeconds(seconds);
          setSubmissionState("rate_limited");
          showToast(msg || `Please wait ${seconds} seconds before submitting again.`, "error");
          return;
        }
      }

      setSubmissionState("idle");
      showToast(err?.message || "Submission failed. Please try again.", "error");
    }
  };

  // Run Code (Test sample cases without submitting to leaderboard)
  const handleRunCode = async () => {
    if (!problem || isRunningCode || isSubmitting) return;

    try {
      setIsRunningCode(true);
      setBottomTab("testcases");
      setRunResult(null);

      const result = await runSampleCode(slug, problem.id, {
        language,
        code,
      });

      setRunResult(result);
      setActiveTestTab(0);

      if (result.verdict === "passed") {
        showToast(`All ${result.totalTests} sample test cases passed!`, "success");
      } else if (result.compileError) {
        showToast("Compilation error in sample test", "error");
      } else {
        showToast(`${result.passedTests}/${result.totalTests} test cases passed.`, "error");
      }
    } catch (err: any) {
      showToast(err?.message || "Failed to run code.", "error");
      setRunResult({
        success: false,
        verdict: "error",
        compileError: err?.message || "Execution error",
        totalTests: problem.samples?.length || 1,
        passedTests: 0,
        testCases: (problem.samples || []).map((s) => ({
          input: s.input,
          expectedOutput: s.expectedOutput,
          actualOutput: null,
          status: "error",
          error: err?.message || "Error running test",
        })),
      });
    } finally {
      setIsRunningCode(false);
    }
  };

  if (notFound) {
    return (
      <AppShell>
        <ErrorState
          heading="Problem not found"
          message="The requested problem was not found in this contest."
          onRetry={() => router.push(`/c/${encodeURIComponent(slug)}`)}
        />
      </AppShell>
    );
  }

  if (error && !problem) {
    return (
      <AppShell>
        <ErrorState
          heading="Error loading problem"
          message={error}
          onRetry={loadData}
        />
      </AppShell>
    );
  }

  if (loading || !problem || !contest) {
    return (
      <AppShell>
        <div className="space-y-6">
          <Skeleton lines={2} />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5"><Card><Skeleton lines={8} /></Card></div>
            <div className="lg:col-span-7"><Card><Skeleton lines={12} /></Card></div>
          </div>
        </div>
      </AppShell>
    );
  }

  const isContestBefore = contest.state === "before";
  const isContestEnded = contest.state === "ended";

  return (
    <AppShell
      breadcrumbs={[
        { label: contest.title, href: `/c/${encodeURIComponent(slug)}` },
        { label: `Problem ${problem.letter}` },
      ]}
      slug={slug}
      user={currentUser}
    >
      <div className="space-y-4">
        {/* Top Problem Tab Strip (A-F) + Contest & Problem Timers */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#26262b]">
          {/* Tab Strip */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {allProblems.map((p) => {
              const isCurrent = p.id === problem.id;
              const isSolved = solvedProblemIds.has(p.id);
              return (
                <Link
                  key={p.id}
                  href={`/c/${encodeURIComponent(slug)}/problems/${encodeURIComponent(p.id)}`}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-mono transition-colors shrink-0 ${
                    isCurrent
                      ? "border-b-2 border-b-[#6D4AFF] text-[#a78bfa] font-semibold bg-[#17171a]/70 rounded-t-md"
                      : "text-[#8b8b94] hover:text-[#ededf0] hover:bg-[#17171a]/40 border-b-2 border-b-transparent rounded-md"
                  }`}
                >
                  <span>{p.letter}</span>
                  {isSolved && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  )}
                  <span className="text-[11px] text-[#5a5a63] truncate max-w-[120px] font-sans">
                    {p.title}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Timers */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {/* Problem Timer */}
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#17171a] border border-[#26262b] text-xs font-mono"
              title="Time spent on this problem on this device"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[#8b8b94]">Problem:</span>
              <span className="text-[#ededf0] font-semibold">
                {formatDuration(problemSeconds)}
              </span>
            </div>

            <StatusBadge status={contest.state} labelOverride={contest.state === "unavailable" ? "Contest status unavailable" : undefined} />
            {contest.serverNow && (contest.state === "before" ? contest.startsAt : contest.state === "running" ? contest.endsAt : null) && (
              <Countdown
                targetTime={(contest.state === "before" ? contest.startsAt : contest.endsAt)!}
                serverNow={contest.serverNow}
                onExpire={refreshContest}
                className="text-xs text-[#ededf0]"
              />
            )}
          </div>
        </div>
        {error && <p role="status" className="text-xs text-amber-400">{error}</p>}

        {/* Two-Column Workbench Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column (5/12): Statement & Submissions Sidebar */}
          <div className="lg:col-span-5 space-y-4">
            {/* Tab Header */}
            <div className="flex items-center gap-1 bg-[#111113] p-1 rounded-lg border border-[#26262b]">
              <button
                type="button"
                onClick={() => setActiveTab("statement")}
                className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all ${
                  activeTab === "statement"
                    ? "bg-[#6D4AFF] text-white font-semibold shadow-sm"
                    : "text-[#8b8b94] hover:text-[#ededf0] hover:bg-[#17171a]"
                }`}
              >
                Problem Statement
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("submissions")}
                className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
                  activeTab === "submissions"
                    ? "bg-[#6D4AFF] text-white font-semibold shadow-sm"
                    : "text-[#8b8b94] hover:text-[#ededf0] hover:bg-[#17171a]"
                }`}
              >
                <span>Submissions</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none ${
                    activeTab === "submissions"
                      ? "bg-white/20 text-white font-bold"
                      : "bg-[#26262b] text-[#8b8b94]"
                  }`}
                >
                  {problemSubmissions.length}
                </span>
              </button>
            </div>

            {activeTab === "statement" ? (
              <Card className="space-y-4">
                <div>
                  <h1 className="text-xl font-semibold text-[#ededf0] tracking-tight">
                    {problem.letter}. {problem.title}
                  </h1>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#8b8b94] font-mono">
                    <span>{problem.points} points</span>
                    <span>· Time limit {LANGUAGE_LIMITS[language].time}</span>
                    <span>· Memory {LANGUAGE_LIMITS[language].memory}</span>
                    <span className="text-[#a78bfa]">
                      · Time on problem: {formatDuration(problemSeconds)}
                    </span>
                  </div>
                </div>

                {/* Statement Paragraphs */}
                <div className="text-sm text-[#ededf0] leading-relaxed space-y-3 font-sans break-words">
                  {problem.statement.split("\n\n").map((para, i) => (
                    <p key={i} className="whitespace-pre-line">
                      {para}
                    </p>
                  ))}
                </div>

                {/* Sample Testcases */}
                {problem.samples && problem.samples.length > 0 && (
                  <div className="pt-3 border-t border-[#26262b] space-y-3">
                    <span className="text-xs font-mono uppercase tracking-wider text-[#8b8b94] font-medium block">
                      Sample Tests
                    </span>

                    {problem.samples.map((s, idx) => (
                      <div key={idx} className="space-y-2 text-xs font-mono">
                        <div>
                          <span className="text-[#8b8b94] text-[11px] block mb-1">
                            Input
                          </span>
                          <pre className="p-2.5 rounded-md bg-[#0a0a0b] border border-[#26262b] text-[#ededf0] overflow-x-auto whitespace-pre-wrap">
                            {s.input}
                          </pre>
                        </div>
                        <div>
                          <span className="text-[#8b8b94] text-[11px] block mb-1">
                            Output
                          </span>
                          <pre className="p-2.5 rounded-md bg-[#0a0a0b] border border-[#26262b] text-emerald-400 overflow-x-auto whitespace-pre-wrap">
                            {s.expectedOutput}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Confirmed Runtimes Notice */}
                <div className="pt-3 border-t border-[#26262b] text-[11px] text-[#5a5a63] font-mono">
                  Python 3.11 · Java 17 · C++17 · C (gcc) · JavaScript (Node)
                </div>
              </Card>
            ) : (
              <Card className="space-y-4">
                <div className="flex items-center justify-between border-b border-[#26262b] pb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-[#ededf0]">
                      Submissions for Problem {problem.letter}
                    </h2>
                    <p className="text-[11px] text-[#8b8b94] font-mono">
                      {problemSubmissions.length} submission{problemSubmissions.length === 1 ? "" : "s"} recorded
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshProblemSubmissions()}
                  >
                    Refresh
                  </Button>
                </div>

                {historyError ? (
                  <ErrorState message={historyError} onRetry={refreshProblemSubmissions} />
                ) : problemSubmissions.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <p className="text-xs text-[#8b8b94]">
                      No submissions recorded for this problem yet.
                    </p>
                    <p className="text-[11px] text-[#5a5a63]">
                      Write your code on the right and click Submit to test against judge cases.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1.5">
                    {problemSubmissions.map((sub, index) => {
                      const isExpanded = expandedSubId === sub.id;

                      return (
                        <div
                          key={sub.id || index}
                          className="p-3 rounded-md border border-[#26262b] bg-[#17171a] space-y-2 transition-colors hover:border-[#6D4AFF]/40"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <StatusBadge status={sub.status === "done" ? sub.verdict || "done" : sub.status} />
                              <span className="text-xs font-mono text-[#ededf0] uppercase">
                                {sub.language}
                              </span>
                            </div>

                            <span className="text-[11px] font-mono text-[#8b8b94]">
                              {sub.judgedAt || sub.clickedAt
                                ? new Date(sub.judgedAt || sub.clickedAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  })
                                : "Just now"}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-xs pt-1">
                            <span className="text-[11px] font-mono text-[#5a5a63] truncate max-w-[150px]">
                              ID: {sub.id.slice(0, 8)}…
                            </span>

                            <div className="flex items-center gap-2">
                              {sub.id && (
                                <button
                                  type="button"
                                  onClick={() => loadSubmissionCode(sub, true)}
                                  className="text-[11px] text-[#a78bfa] hover:text-[#c4b5fd] font-mono transition-colors"
                                >
                                  Load in Editor
                                </button>
                              )}
                              {sub.id && (
                                <button
                                  type="button"
                                  onClick={() => loadSubmissionCode(sub, false)}
                                  className="text-[11px] text-[#8b8b94] hover:text-[#ededf0] font-mono transition-colors"
                                >
                                  {isExpanded ? "Hide Code" : "View Code"}
                                </button>
                              )}
                            </div>
                          </div>

                          {isExpanded && sub.verdict === "compile_error" && sub.compileOutput && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono text-[#8b8b94] uppercase tracking-wider block">
                                Compiler output:
                              </span>
                              <pre className="p-2.5 rounded bg-[#0a0a0b] border border-rose-500/25 text-rose-300 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap">
                                {sub.compileOutput}
                              </pre>
                            </div>
                          )}

                          {isExpanded && sub.code && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono text-[#8b8b94] uppercase tracking-wider block">
                                Submitted Code:
                              </span>
                              <pre className="p-2.5 rounded bg-[#0a0a0b] border border-[#26262b] text-[11px] font-mono text-[#ededf0] overflow-x-auto max-h-48 whitespace-pre-wrap">
                                {sub.code}
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            )}
          </div>

          {/* Right Column (58%): Editor & Result Panel */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="p-0 overflow-hidden border-[#26262b] flex flex-col">
              {/* Toolbar */}
              <div className="p-3 bg-[#17171a] border-b border-[#26262b] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as SupportedLanguage)}
                    disabled={isContestEnded || isContestBefore}
                    className="bg-[#111113] border border-[#26262b] text-xs text-[#ededf0] px-2.5 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-[#6D4AFF]/40 focus:border-[#6D4AFF] cursor-pointer"
                  >
                    <option value="cpp">C++17</option>
                    <option value="python">Python 3.11</option>
                    <option value="java">Java 17</option>
                    <option value="c">C (gcc)</option>
                    <option value="javascript">JavaScript (Node)</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setActiveTab(activeTab === "submissions" ? "statement" : "submissions")}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs border transition-colors ${
                      activeTab === "submissions"
                        ? "border-[#6D4AFF] bg-[#6D4AFF]/10 text-white font-medium"
                        : "border-[#26262b] bg-[#111113] text-[#8b8b94] hover:text-[#ededf0] hover:border-[#3f3f46]"
                    }`}
                    title="Toggle Submissions Sidebar"
                  >
                    <svg className="w-3.5 h-3.5 text-[#a78bfa]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Submissions ({problemSubmissions.length})</span>
                  </button>

                  <span className="text-xs font-mono text-[#8b8b94] hidden sm:inline">
                    {draftStatus}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      const starter =
                        (problem?.starterCode && problem.starterCode[language]) ||
                        LANGUAGE_MAP[language].starter;
                      setCode(starter);
                      persistDraft(starter);
                      showToast("Code reset to problem starter template.", "info");
                    }}
                    disabled={isContestEnded || isContestBefore}
                    className="text-[11px] font-mono text-[#8b8b94] hover:text-[#ededf0] underline transition-colors"
                    title="Reset to problem template"
                  >
                    Reset
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {codeSizeWarning && (
                    <span className="text-xs text-rose-400 font-mono">
                      {codeSizeWarning}
                    </span>
                  )}

                  {/* Run Code Button */}
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={isRunningCode}
                    disabled={
                      isRunningCode ||
                      isSubmitting ||
                      isPolling ||
                      contest.state !== "running" ||
                      Boolean(codeSizeWarning && codeSizeWarning.includes("larger"))
                    }
                    onClick={handleRunCode}
                    title="Test your solution against sample test cases without submitting to leaderboard"
                  >
                    <svg className="w-3.5 h-3.5 text-emerald-400 -ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                    <span>Run</span>
                  </Button>

                  {/* Submit Button */}
                  <Button
                    variant="primary"
                    size="sm"
                    loading={isSubmitting || isPolling}
                    disabled={
                      isSubmitting ||
                      isRunningCode ||
                      submissionState === "submitting" ||
                      submissionState === "queued" ||
                      submissionState === "judging" ||
                      contest.state !== "running" ||
                      Boolean(codeSizeWarning && codeSizeWarning.includes("larger")) ||
                      rateLimitSeconds > 0 ||
                      Boolean(pendingElsewhere)
                    }
                    onClick={handleSubmit}
                  >
                    {rateLimitSeconds > 0
                      ? `Wait ${rateLimitSeconds}s`
                      : isContestEnded
                        ? "Submissions closed"
                        : (isSubmitting || submissionState === "submitting" || submissionState === "queued" || submissionState === "judging")
                          ? (submissionState === "queued" ? "Queued" : "Judging…")
                          : "Submit"}
                  </Button>
                </div>
              </div>

              {/* Editor Surface or Blocked State */}
              <div className="h-[460px] w-full bg-[#0a0a0b] relative border-y border-[#26262b]">
                {isContestBefore ? (
                  <div className="h-full flex items-center justify-center p-6 text-center">
                    <p className="text-sm text-[#8b8b94]">
                      Problems open when contest starts.
                    </p>
                  </div>
                ) : (
                  <Editor
                    height="100%"
                    language={LANGUAGE_MAP[language].monacoLang}
                    theme="vs-dark"
                    value={code}
                    onChange={handleCodeChange}
                    onMount={handleEditorDidMount}
                    options={{
                      fontSize: 14,
                      minimap: { enabled: false },
                      wordWrap: "on",
                      automaticLayout: true,
                      readOnly: isContestEnded,
                      lineNumbers: "on",
                      scrollBeyondLastLine: false,
                    }}
                  />
                )}
              </div>

              {/* Bottom Tab Navigation: Test Results (Run) vs Submission Status (Submit) */}
              <div className="bg-[#17171a] border-t border-[#26262b] px-3 py-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setBottomTab("testcases")}
                    className={`px-3 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1.5 ${
                      bottomTab === "testcases"
                        ? "bg-[#6D4AFF]/15 text-[#a78bfa] border border-[#6D4AFF]/30 font-medium"
                        : "text-[#8b8b94] hover:text-[#ededf0] border border-transparent"
                    }`}
                  >
                    <span>Run Output</span>
                    {runResult && (
                      <span
                        className={`w-2 h-2 rounded-full ${
                          runResult.verdict === "passed"
                            ? "bg-emerald-400"
                            : runResult.compileError
                              ? "bg-amber-400"
                              : "bg-rose-400"
                        }`}
                      />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setBottomTab("result")}
                    className={`px-3 py-1 rounded text-xs font-mono transition-colors flex items-center gap-1.5 ${
                      bottomTab === "result"
                        ? "bg-[#6D4AFF]/15 text-[#a78bfa] border border-[#6D4AFF]/30 font-medium"
                        : "text-[#8b8b94] hover:text-[#ededf0] border border-transparent"
                    }`}
                  >
                    <span>Submission Status</span>
                    {latestVerdict && (
                      <span
                        className={`w-2 h-2 rounded-full ${
                          latestVerdict === "accepted" ? "bg-emerald-400" : "bg-rose-400"
                        }`}
                      />
                    )}
                  </button>
                </div>

                {bottomTab === "testcases" && runResult && (
                  <span className="text-[11px] font-mono text-[#8b8b94]">
                    {runResult.passedTests}/{runResult.totalTests} Passed
                  </span>
                )}
              </div>

              {/* Bottom Panel Surface (~210px, scrollable) */}
              <div className="h-[210px] p-3.5 bg-[#111113] overflow-y-auto text-xs font-mono">
                {bottomTab === "testcases" ? (
                  /* RUN CODE TESTCASES TAB */
                  <div>
                    {isRunningCode ? (
                      <div className="flex flex-col items-center justify-center h-36 gap-2 text-[#8b8b94]">
                        <div className="w-6 h-6 rounded-full border-2 border-[#26262b] border-t-emerald-400 animate-spin" />
                        <span className="text-xs">Running sample test cases…</span>
                      </div>
                    ) : !runResult ? (
                      <div className="flex flex-col items-center justify-center h-36 text-center text-[#5a5a63] space-y-1">
                        <p>No test results yet.</p>
                        <p className="text-[11px]">Click "Run" above to test your code against the problem's sample test cases.</p>
                      </div>
                    ) : runResult.compileError ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-rose-500/15 text-rose-400 border border-rose-500/30 font-semibold">
                            Compilation Error
                          </span>
                        </div>
                        <pre className="p-3 rounded bg-[#0a0a0b] border border-rose-500/30 text-rose-300 text-xs overflow-x-auto whitespace-pre-wrap">
                          {runResult.compileError}
                        </pre>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Overall Badge Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-[#26262b]">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider ${
                                runResult.verdict === "passed"
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                              }`}
                            >
                              {runResult.verdict === "passed" ? "Accepted" : "Wrong Answer"}
                            </span>
                            <span className="text-[#ededf0] font-medium text-xs">
                              {runResult.passedTests} of {runResult.totalTests} test cases passed
                            </span>
                          </div>
                        </div>

                        {/* Test Case Tab Pill Selector */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                          {runResult.testCases.map((tc, idx) => {
                            const isSelected = activeTestTab === idx;
                            const isPass = tc.status === "passed";
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setActiveTestTab(idx)}
                                className={`px-2.5 py-1 rounded text-xs font-mono flex items-center gap-1.5 transition-colors ${
                                  isSelected
                                    ? isPass
                                    : tc.status === "error"
                                      ? "bg-amber-950/20 text-amber-400 hover:bg-amber-950/40"
                                      : "bg-rose-950/20 text-rose-400 hover:bg-rose-950/40"
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isPass ? "bg-emerald-400" : tc.status === "error" ? "bg-amber-400" : "bg-rose-400"
                                  }`}
                                />
                                <span>Case {idx + 1}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Selected Test Case Inspection (Input vs Expected vs Actual) */}
                        {runResult.testCases[activeTestTab] && (() => {
                          const activeCase = runResult.testCases[activeTestTab];
                          return (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                              <div>
                                <span className="text-[11px] text-[#8b8b94] uppercase tracking-wider block mb-1">
                                  Input
                                </span>
                                <pre className="p-2 rounded bg-[#0a0a0b] border border-[#26262b] text-[#ededf0] overflow-x-auto max-h-24 whitespace-pre-wrap">
                                  {activeCase.input || "(empty input)"}
                                </pre>
                              </div>
                              <div>
                                <span className="text-[11px] text-[#8b8b94] uppercase tracking-wider block mb-1">
                                  Expected Output
                                </span>
                                <pre className="p-2 rounded bg-[#0a0a0b] border border-[#26262b] text-emerald-400 overflow-x-auto max-h-24 whitespace-pre-wrap">
                                  {activeCase.expectedOutput || "(empty output)"}
                                </pre>
                              </div>
                              <div>
                                <span className="text-[11px] text-[#8b8b94] uppercase tracking-wider block mb-1 flex items-center justify-between">
                                  <span>Your Output</span>
                                  {activeCase.status === "passed" ? (
                                    <span className="text-emerald-400 font-semibold">Match</span>
                                  ) : (
                                    <span className="text-rose-400 font-semibold">Mismatch</span>
                                  )}
                                </span>
                                <pre
                                  className={`p-2 rounded bg-[#0a0a0b] border overflow-x-auto max-h-24 whitespace-pre-wrap ${
                                    activeCase.status === "passed"
                                      ? "border-emerald-500/30 text-emerald-300"
                                      : "border-rose-500/30 text-rose-300"
                                  }`}
                                >
                                  {activeCase.actualOutput || (activeCase.error ? `[${activeCase.error}]` : "(no output)")}
                                </pre>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ) : (
                  /* SUBMISSION STATUS TAB */
                  <div>
                    {isContestEnded && (
                      <div className="text-[#8b8b94]">
                        The contest has ended. Submissions are closed.
                      </div>
                    )}

                    {!isContestEnded && pendingElsewhere && (
                      <div className="space-y-1 text-amber-400">
                        <div>
                          You have a submission in progress on problem{" "}
                          <Link
                            href={`/c/${encodeURIComponent(slug)}/problems/${encodeURIComponent(pendingElsewhere.problemId)}`}
                            className="underline font-bold"
                          >
                            {pendingElsewhere.letter}
                          </Link>
                          .
                        </div>
                        <div className="text-[#8b8b94]">
                          Wait for it to finish before submitting another solution.
                        </div>
                        {elsewhereMessage && (
                          <div className="space-y-2 text-[#8b8b94]">
                            <p>{elsewhereMessage}</p>
                            <Button size="sm" variant="secondary" onClick={() => setElsewherePollRun((run) => run + 1)}>
                              Check again
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {pollingMessage && (
                      <div className="mb-3 space-y-2 text-[#8b8b94]">
                        <p>{pollingMessage}</p>
                        {!isPolling && activeSubmissionId && (
                          <Button size="sm" variant="secondary" onClick={() => startPolling(activeSubmissionId)}>
                            Check again
                          </Button>
                        )}
                      </div>
                    )}

                    {!isContestEnded && !pendingElsewhere && submissionState === "idle" && (
                      <div className="text-[#5a5a63] flex flex-col items-center justify-center h-36">
                        <p>No active submission.</p>
                        <p className="text-[11px] pt-1">Click "Submit" when you are ready to evaluate against all judge cases.</p>
                      </div>
                    )}

                    {(submissionState === "submitting" || submissionState === "queued" || submissionState === "judging") && (
                      <div className="flex flex-col items-center justify-center h-36 gap-3">
                        <div className="relative w-8 h-8">
                          <div className="absolute inset-0 rounded-full border-2 border-[#26262b]" />
                          <div className="absolute inset-0 rounded-full border-2 border-t-[#6D4AFF] animate-spin" />
                        </div>
                        <div className="text-sm text-[#8b8b94] animate-pulse">
                          {submissionState === "queued" ? "Queued" : submissionState === "judging" ? "Judging…" : "Submitting…"}
                        </div>
                        {activeSubmissionId && (
                          <div className="text-[10px] text-[#5a5a63]">
                            ID: {activeSubmissionId}
                          </div>
                        )}
                      </div>
                    )}

                    {submissionState === "verdict" && !latestVerdict && (
                      <p className="text-[#8b8b94]">The server has not supplied a verdict yet.</p>
                    )}

                    {submissionState === "verdict" && latestVerdict && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <StatusBadge status={latestVerdict} />
                          {latestVerdict === "accepted" && pointsEarned !== null && (
                            <span className="text-emerald-400 font-semibold">
                              {pointsEarned} pts
                            </span>
                          )}
                          {judgedAtTime && (
                            <span className="text-[#5a5a63] text-[11px]">
                              {judgedAtTime}
                            </span>
                          )}
                        </div>

                        {compileOutput && (
                          <pre className="p-2.5 rounded bg-[#0a0a0b] border border-rose-500/20 text-rose-300 text-[11px] overflow-x-auto whitespace-pre-wrap">
                            {compileOutput}
                          </pre>
                        )}
                        {latestVerdict === "judge_error" && (
                          <p className="text-[#8b8b94]">The judge could not complete this submission. Your code is saved; contact the organisers.</p>
                        )}
                      </div>
                    )}

                    {submissionState === "rate_limited" && (
                      <div className="text-amber-400">
                        Please wait {rateLimitSeconds} seconds before submitting again.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
