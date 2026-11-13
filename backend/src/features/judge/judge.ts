import type { Language, Verdict } from "../../generated/prisma/enums.js";

export interface JudgeResult {
    verdict: Verdict;
    compileOutput: string | null;
}

type TestResult = { status_id: number; compile_output?: string | null };
const MAX_COMPILE_OUTPUT_BYTES = 16 * 1024;

// Replaced Record<string, number> with standard object bracket notation
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

        await new Promise(res => setTimeout(res, 1500));
        
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

// 1. const priority = [...]
// This establishes the hierarchy of bad news. If the server itself crashes (judge_error), that is the most important thing to report. If the code won't even build (compile_error), that overrides a timeout (tle), and so on.

// 2. const found = new Set(...)
// This takes the 5 raw numeric results from Judge0, translates them into words, and removes the duplicates.
// If the results were ["accepted", "tle", "accepted", "wrong_answer", "accepted"], this line shrinks it into a simple basket of unique results: { "accepted", "tle", "wrong_answer" }.

// 3. return priority.find(...) ?? "accepted"
// This reads the priority list from left to right, checking if each error exists in the student's basket:

// If it checks the entire priority list and finds absolutely zero errors in the basket, the ?? "accepted" at the end catches it and awards a perfect score.
