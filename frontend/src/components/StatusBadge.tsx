import React from "react";

export type StatusType =
  | "before"
  | "upcoming"
  | "running"
  | "ended"
  | "accepted"
  | "wrong_answer"
  | "tle"
  | "runtime_error"
  | "compile_error"
  | "judge_error"
  | "queued"
  | "judging"
  | "not_attempted"
  | "attempted"
  | "solved"
  | string;

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
  labelOverride?: string;
}

export function StatusBadge({
  status,
  className = "",
  labelOverride,
}: StatusBadgeProps) {
  const normalized = (status || "").toLowerCase().trim();

  switch (normalized) {
    case "accepted":
    case "solved":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          {labelOverride || (normalized === "solved" ? "Solved" : "Accepted")}
        </span>
      );

    case "wrong_answer":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-rose-950/40 text-rose-400 border border-rose-500/20 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          {labelOverride || "Wrong Answer"}
        </span>
      );

    case "runtime_error":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-rose-950/40 text-rose-400 border border-rose-500/20 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          {labelOverride || "Runtime Error"}
        </span>
      );

    case "compile_error":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-rose-950/40 text-rose-400 border border-rose-500/20 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          {labelOverride || "Compile Error"}
        </span>
      );

    case "tle":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-950/40 text-amber-400 border border-amber-500/20 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          {labelOverride || "Time Limit Exceeded"}
        </span>
      );

    case "judge_error":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-900/80 text-zinc-400 border border-dashed border-zinc-600 ${className}`}
        >
          {labelOverride || "Judge Error"}
        </span>
      );

    case "queued":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-sky-950/40 text-sky-400 border border-sky-500/20 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          {labelOverride || "Queued"}
        </span>
      );

    case "judging":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-sky-950/40 text-sky-400 border border-sky-500/20 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          {labelOverride || "Judging"}
        </span>
      );

    case "running":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {labelOverride || "Running"}
        </span>
      );

    case "before":
    case "upcoming":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-900 text-zinc-400 border border-zinc-700/60 ${className}`}
        >
          {labelOverride || "Upcoming"}
        </span>
      );

    case "ended":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-900 text-zinc-400 border border-zinc-800 ${className}`}
        >
          {labelOverride || "Ended"}
        </span>
      );

    case "unknown":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-900 text-zinc-400 border border-zinc-800 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
          {labelOverride || "Status unavailable"}
        </span>
      );

    case "attempted":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-900 text-zinc-300 border border-zinc-700 ${className}`}
        >
          {labelOverride || "Attempted"}
        </span>
      );

    case "not_attempted":
    case "not attempted":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium text-zinc-500 ${className}`}
        >
          {labelOverride || "Not attempted"}
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-900 text-zinc-400 border border-zinc-800 ${className}`}
        >
          {labelOverride || status}
        </span>
      );
  }
}

