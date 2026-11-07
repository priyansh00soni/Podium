import { Verdict } from "../../generated/prisma/enums.js";

const JUDGE0_LANGUAGE_IDS: Record<string, number> = {
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
    language: string, 
    tests: any[], 
    limits: { time: number; memory: number }
): Promise<Verdict> {
    const judgeUrl = process.env.JUDGE_URL;
    const authToken = process.env.JUDGE_AUTH_TOKEN;

    if (!judgeUrl) {
        throw new Error("JUDGE_URL environment variable is not set.");
    }

    // Typed as a plain record to allow dynamic index assignment
    const headers: Record<string, string> = {
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
        stdin: test.input!==undefined ? Buffer.from(test.input).toString("base64") : null,
        // Assuming test files are trimmed upon creation to address whitespace differences
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
    const tokens = createData.map((t: { token: string }) => t.token).join(",");

    // 2. Poll until all tests leave status 1 and 2, with a hard deadline
    let isProcessing = true;
    let results: any[] = [];
    const deadline = Date.now() + 120_000;
    
    while (isProcessing) {
        if (Date.now() > deadline) {
            throw new Error("Judge polling deadline reached");
        }

        await new Promise(res => setTimeout(res, 1500));
        
        const pollRes = await fetch(`${judgeUrl}/submissions/batch?tokens=${tokens}&base64_encoded=true&fields=status_id`, {
            signal: AbortSignal.timeout(10_000),
            headers
        });
        
        if (!pollRes.ok) throw new Error(`Judge polling failed: ${pollRes.status}`);
        
        const pollData = await pollRes.json();
        results = pollData.submissions;
        
        isProcessing = results.some((sub: any) => sub.status_id <= 2);
    }

    // 3 & 4. Map results and prioritize severity
    const priority: Verdict[] = ["judge_error", "compile_error", "runtime_error", "tle", "wrong_answer"];
    const found = new Set(results.map(r => mapStatusToVerdict(r.status_id)));
    
    return priority.find(v => found.has(v)) ?? "accepted";
}