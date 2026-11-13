import type { Language, Verdict } from "../../generated/prisma/enums.js";
import { setTimeout as sleep } from "node:timers/promises";

export interface JudgeResult {
    verdict: Verdict;
    compileOutput: string | null;
}

type TestResult = { status_id: number; compile_output?: string | null };
const MAX_COMPILE_OUTPUT_BYTES = 16 * 1024;


const JUDGE0_LANGUAGE_IDS: { [key: string]: number } = {
    c: 50,
    cpp: 54,
    java: 62,
    javascript: 93,
    python: 71,
};

const mapStatusToVerdict = (statusId: number): Verdict => {
    switch (statusId) {
        case 3: return "accepted";
        case 4: return "wrong_answer";
        case 5: return "tle";
        case 6: return "compile_error";
        case 13: return "judge_error";
        default:
            if (statusId >= 7 && statusId <= 12) return "runtime_error";
            return "judge_error";
    }
};

export async function runTests(
    code: string, 
    language: Language,
    tests: { input: string; expectedOutput: string }[],
    limits: { time: number; memory: number }
): Promise<JudgeResult> {
    const judgeUrl = process.env.JUDGE_URL;
    const authToken = process.env.JUDGE_AUTH_TOKEN;

    if (!judgeUrl) {
        throw new Error("JUDGE_URL environment variable is not set.");
    }

    const headers: { [key: string]: string } = {
        "Content-Type": "application/json",
    };
    if (authToken) {
        headers["X-Auth-Token"] = authToken;
    }

    // 1. Build and send batch request
    const base64Code = Buffer.from(code).toString("base64");
    const languageId = JUDGE0_LANGUAGE_IDS[language];

    const submissions = tests.map(test => ({
        language_id: languageId,
        source_code: base64Code,
        stdin: test.input !== undefined ? Buffer.from(test.input).toString("base64") : null,
        expected_output: test.expectedOutput !== undefined ? Buffer.from(test.expectedOutput).toString("base64") : null,
        cpu_time_limit: limits.time,
        memory_limit: limits.memory * 1024,
        enable_network: false
    }));

    const createRes = await fetch(`${judgeUrl}/submissions/batch?base64_encoded=true`, {
        signal: AbortSignal.timeout(10_000),
        method: "POST",
        headers,
        body: JSON.stringify({ submissions })
    });

    if (!createRes.ok) throw new Error(`Judge creation failed: ${createRes.status}`);
    
    const createData = await createRes.json();
    if (!Array.isArray(createData) || createData.length !== tests.length ||
        createData.some(result => typeof result.token !== "string" || !result.token)) {
        throw new Error("Judge returned an invalid submission batch.");
    }
    const tokens = createData.map((t: { token: string }) => t.token).join(",");

    // 2. Poll until all tests leave status 1 and 2, with a hard deadline, Status 1 means "In Queue" and 2 means "Processing".
    let isProcessing = true;
    let results: TestResult[] = [];
    const deadline = Date.now() + 120_000;
    
    while (isProcessing) {
        if (Date.now() > deadline) {
            throw new Error("Judge polling deadline reached");
        }

        await sleep(1500);
        
        const pollRes = await fetch(`${judgeUrl}/submissions/batch?tokens=${tokens}&base64_encoded=true&fields=status_id,compile_output`, {
            signal: AbortSignal.timeout(10_000),
            headers
        });
        
        if (!pollRes.ok) throw new Error(`Judge polling failed: ${pollRes.status}`);
        
        const pollData = await pollRes.json();
        if (!Array.isArray(pollData.submissions) || pollData.submissions.length !== tests.length) {
            throw new Error("Judge returned an incomplete result batch.");
        }
        results = pollData.submissions;
        
        isProcessing = results.some((sub: any) => sub.status_id <= 2); //Status 1 means "In Queue" and 2 means "Processing".
    }

    // 3 & 4. Map results and prioritize severity
    const priority: Verdict[] = ["judge_error", "compile_error", "runtime_error", "tle", "wrong_answer"];
    const found = new Set(results.map(r => mapStatusToVerdict(r.status_id)));
    
    const verdict = priority.find(v => found.has(v)) ?? "accepted";
    const compilerResult = results.find(result => result.status_id === 6 && result.compile_output);
    let compileOutput: string | null = null;

    if (verdict === "compile_error" && compilerResult?.compile_output) {
        const output = Buffer.from(compilerResult.compile_output, "base64");
        compileOutput = output.subarray(0, MAX_COMPILE_OUTPUT_BYTES).toString("utf8");
        if (output.length > MAX_COMPILE_OUTPUT_BYTES) compileOutput += "\n[Compiler output truncated]";
    }

    return { verdict, compileOutput };
}

export interface DetailedTestResult {
  input: string;
  expectedOutput: string;
  actualOutput: string | null;
  status: "passed" | "failed" | "error";
  time?: string;
  memory?: string;
  error?: string | null;
}

export interface RunCodeDetailedResponse {
  success: boolean;
  verdict: "passed" | "failed" | "error";
  compileError?: string | null;
  totalTests: number;
  passedTests: number;
  testCases: DetailedTestResult[];
}

const toBase64 = (str: string) => Buffer.from(str).toString("base64");
const fromBase64 = (str: string) => Buffer.from(str, "base64").toString("utf8");

export async function runSampleTestsDetailed(
  code: string,
  language: Language,
  tests: { input: string; expectedOutput: string }[],
  limits: { time: number; memory: number }
) {
  const judgeUrl = process.env.JUDGE_URL;
  if (!judgeUrl) throw new Error("JUDGE_URL environment variable is not set.");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (process.env.JUDGE_AUTH_TOKEN) {
    headers["X-Auth-Token"] = process.env.JUDGE_AUTH_TOKEN;
  }

  const base64Code = toBase64(code);
  const submissions = tests.map(test => ({
    language_id: JUDGE0_LANGUAGE_IDS[language],
    source_code: base64Code,
    stdin: test.input !== undefined ? toBase64(test.input) : null,
    expected_output: test.expectedOutput !== undefined ? toBase64(test.expectedOutput) : null,
    cpu_time_limit: limits.time,
    memory_limit: limits.memory * 1024,
    enable_network: false,
  }));

  const createRes = await fetch(`${judgeUrl}/submissions/batch?base64_encoded=true`, {
    signal: AbortSignal.timeout(10_000),
    method: "POST",
    headers,
    body: JSON.stringify({ submissions }),
  });

  if (!createRes.ok) throw new Error(`Judge creation failed: ${createRes.status}`);

  const createData = await createRes.json();
  if (!Array.isArray(createData) || createData.length !== tests.length) {
    throw new Error("Judge returned an invalid submission batch.");
  }

  const tokens = createData.map((t: { token: string }) => t.token).join(",");
  const deadline = Date.now() + 60_000;
  let results: any[] = [];

  while (true) {
    if (Date.now() > deadline) throw new Error("Judge polling deadline reached");

    await sleep(1200);

    const pollRes = await fetch(
      `${judgeUrl}/submissions/batch?tokens=${tokens}&base64_encoded=true&fields=status_id,stdout,stderr,compile_output,time,memory,status`,
      { signal: AbortSignal.timeout(10_000), headers }
    );

    if (!pollRes.ok) throw new Error(`Judge polling failed: ${pollRes.status}`);

    const pollData = await pollRes.json();
    results = pollData.submissions || [];

    if (!results.some((sub: any) => sub.status_id <= 2)) break;
  }

  const compileErr = results.find(r => r.status_id === 6 && r.compile_output);
  if (compileErr) {
    return {
      success: false,
      verdict: "error" as const,
      compileError: fromBase64(compileErr.compile_output),
      totalTests: tests.length,
      passedTests: 0,
      testCases: tests.map(t => ({
        input: t.input,
        expectedOutput: t.expectedOutput,
        actualOutput: null,
        status: "error" as const,
        error: "Compilation failed",
      })),
    };
  }

  let passedTests = 0;
  const testCases: DetailedTestResult[] = results.map((res, idx) => {
    const test = tests[idx];
    const stdout = res.stdout ? fromBase64(res.stdout).trim() : "";
    const stderr = res.stderr ? fromBase64(res.stderr).trim() : null;
    const expected = (test?.expectedOutput ?? "").trim();
    const isPassed = res.status_id === 3 || stdout === expected;

    if (isPassed) passedTests++;

    let error: string | null = null;
    if (res.status_id === 5) error = "Time Limit Exceeded";
    else if (res.status_id >= 7 && res.status_id <= 12) error = stderr || "Runtime Error";
    else if (!isPassed) error = "Output mismatch";

    return {
      input: test?.input ?? "",
      expectedOutput: expected,
      actualOutput: stdout || null,
      status: isPassed ? "passed" : error?.includes("Error") ? "error" : "failed",
      time: res.time ? `${res.time}s` : undefined,
      memory: res.memory ? `${Math.round(res.memory / 1024)}MB` : undefined,
      error,
    };
  });

  const success = passedTests === tests.length;
  return {
    success,
    verdict: success ? ("passed" as const) : ("failed" as const),
    totalTests: tests.length,
    passedTests,
    testCases,
  };
}

// 1. const priority = [...]
// This establishes the hierarchy of bad news. If the server itself crashes (judge_error), that is the most important thing to report. If the code won't even build (compile_error), that overrides a timeout (tle), and so on.

// 2. const found = new Set(...)
// This takes the 5 raw numeric results from Judge0, translates them into words, and removes the duplicates.
// If the results were ["accepted", "tle", "accepted", "wrong_answer", "accepted"], this line shrinks it into a simple basket of unique results: { "accepted", "tle", "wrong_answer" }.

// 3. return priority.find(...) ?? "accepted"
// This reads the priority list from left to right, checking if each error exists in the student's basket:

// If it checks the entire priority list and finds absolutely zero errors in the basket, the ?? "accepted" at the end catches it and awards a perfect score.
