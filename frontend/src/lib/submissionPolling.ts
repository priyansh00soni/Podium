import { ApiRequestError, InvalidSubmissionResponseError, pollSubmission, SubmissionDetail } from "./api";

interface PollOptions {
  slug: string;
  id: string;
  signal: AbortSignal;
  onUpdate: (submission: SubmissionDetail) => void;
  onRetry?: () => void;
  timeoutMs?: number;
  intervalMs?: number;
}

function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

export async function waitForSubmission(options: PollOptions): Promise<"done" | "timeout"> {
  const deadline = Date.now() + (options.timeoutMs ?? 180_000);

  while (Date.now() < deadline) {
    options.signal.throwIfAborted();
    let submission: SubmissionDetail | null = null;
    try {
      const signal = AbortSignal.any([
        options.signal,
        AbortSignal.timeout(Math.max(1, Math.min(10_000, deadline - Date.now()))),
      ]);
      submission = await pollSubmission(options.slug, options.id, signal);
    } catch (error) {
      options.signal.throwIfAborted();
      if (error instanceof InvalidSubmissionResponseError) throw error;
      if (error instanceof ApiRequestError && [401, 403, 404].includes(error.status)) throw error;
      options.onRetry?.();
    }

    if (submission) {
      if (submission.id !== options.id) throw new Error("The server returned a different submission.");
      options.onUpdate(submission);
      if (submission.status === "done") return "done";
    }

    await pause(Math.min(options.intervalMs ?? 2000, Math.max(0, deadline - Date.now())), options.signal);
  }

  return "timeout";
}
