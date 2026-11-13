"use client";

import { FormEvent, use, useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { SessionGate } from "@/components/SessionGate";
import { useToast } from "@/components/Toast";
import {
  ApiRequestError,
  createProblem,
  getMe,
  getProblems,
  rememberContest,
  titleFromSlug,
  CurrentUser,
  ProblemSummary,
  SupportedLanguage,
} from "@/lib/api";

const LANGUAGE_OPTIONS: { id: SupportedLanguage; label: string }[] = [
  { id: "cpp", label: "C++17" },
  { id: "python", label: "Python 3.11" },
  { id: "java", label: "Java 17" },
  { id: "javascript", label: "JavaScript (Node)" },
  { id: "c", label: "C (gcc)" },
];

const DEFAULT_LEETCODE_STARTER: Record<SupportedLanguage, string> = {
  cpp: `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

class Solution {
public:
    int solve(int a, int b) {
        // Return your answer here
        return a + b;
    }
};`,
  python: `class Solution:
    def solve(self, a: int, b: int) -> int:
        # Return your answer here
        return a + b`,
  java: `class Solution {
    public int solve(int a, int b) {
        // Return your answer here
        return a + b;
    }
}`,
  javascript: `/**
 * @param {number} a
 * @param {number} b
 * @return {number}
 */
function solve(a, b) {
    // Return your answer here
    return a + b;
}`,
  c: `#include <stdio.h>

int solve(int a, int b) {
    // Return your answer here
    return a + b;
}`,
};

const DEFAULT_LEETCODE_DRIVER: Record<SupportedLanguage, string> = {
  cpp: `int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int a, b;
    if (cin >> a >> b) {
        Solution sol;
        cout << sol.solve(a, b) << "\\n";
    }
    return 0;
}`,
  python: `import sys

def _run():
    tokens = sys.stdin.read().split()
    if len(tokens) >= 2:
        a = int(tokens[0])
        b = int(tokens[1])
        sol = Solution()
        print(sol.solve(a, b))

if __name__ == "__main__":
    _run()`,
  java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int a = sc.nextInt();
            int b = sc.nextInt();
            Solution sol = new Solution();
            System.out.println(sol.solve(a, b));
        }
    }
}`,
  javascript: `const fs = require("fs");

function _main() {
    const tokens = fs.readFileSync("/dev/stdin", "utf-8").trim().split(/\\s+/);
    if (tokens.length >= 2) {
        const a = parseInt(tokens[0], 10);
        const b = parseInt(tokens[1], 10);
        console.log(solve(a, b));
    }
}
_main();`,
  c: `int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) == 2) {
        printf("%d\\n", solve(a, b));
    }
    return 0;
}`,
};

const DEFAULT_STANDARD_STARTER: Record<SupportedLanguage, string> = {
  cpp: `#include <iostream>

using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    // Read input and print output
    int a, b;
    if (cin >> a >> b) {
        cout << a + b << "\\n";
    }

    return 0;
}`,
  python: `import sys

def main():
    tokens = sys.stdin.read().split()
    if len(tokens) >= 2:
        a = int(tokens[0])
        b = int(tokens[1])
        print(a + b)

if __name__ == "__main__":
    main()`,
  java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int a = sc.nextInt();
            int b = sc.nextInt();
            System.out.println(a + b);
        }
    }
}`,
  javascript: `const fs = require("fs");

function main() {
    const tokens = fs.readFileSync("/dev/stdin", "utf-8").trim().split(/\\s+/);
    if (tokens.length >= 2) {
        const a = parseInt(tokens[0], 10);
        const b = parseInt(tokens[1], 10);
        console.log(a + b);
    }
}
main();`,
  c: `#include <stdio.h>

int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) == 2) {
        printf("%d\\n", a + b);
    }
    return 0;
}`,
};

const DEFAULT_STANDARD_DRIVER: Record<SupportedLanguage, string> = {
  cpp: `// Standard competitive I/O mode - contestant's main() executes directly`,
  python: `# Standard competitive I/O mode - contestant's main() executes directly`,
  java: `// Standard competitive I/O mode - contestant's Main class executes directly`,
  javascript: `// Standard competitive I/O mode - contestant's code executes directly`,
  c: `// Standard competitive I/O mode - contestant's main() executes directly`,
};

function buildLeetCodeTemplates(fnName: string, retType: string, params: string) {
  const cppStarter = `#include <iostream>
#include <vector>
#include <string>
#include <algorithm>

using namespace std;

class Solution {
public:
    ${retType} ${fnName}(${params}) {
        // Return your answer here
        return 0;
    }
};`;

  const cppDriver = `int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int a, b;
    if (cin >> a >> b) {
        Solution sol;
        cout << sol.${fnName}(a, b) << "\\n";
    }
    return 0;
}`;

  const pyStarter = `class Solution:
    def ${fnName}(self, a: int, b: int) -> int:
        # Return your answer here
        return 0`;

  const pyDriver = `import sys

def _run():
    tokens = sys.stdin.read().split()
    if len(tokens) >= 2:
        a = int(tokens[0])
        b = int(tokens[1])
        sol = Solution()
        print(sol.${fnName}(a, b))

if __name__ == "__main__":
    _run()`;

  const javaStarter = `class Solution {
    public ${retType} ${fnName}(${params}) {
        // Return your answer here
        return 0;
    }
}`;

  const javaDriver = `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        if (sc.hasNextInt()) {
            int a = sc.nextInt();
            int b = sc.nextInt();
            Solution sol = new Solution();
            System.out.println(sol.${fnName}(a, b));
        }
    }
}`;

  const jsStarter = `/**
 * @return {number}
 */
function ${fnName}(a, b) {
    // Return your answer here
    return 0;
}`;

  const jsDriver = `const fs = require("fs");

function _main() {
    const tokens = fs.readFileSync("/dev/stdin", "utf-8").trim().split(/\\s+/);
    if (tokens.length >= 2) {
        const a = parseInt(tokens[0], 10);
        const b = parseInt(tokens[1], 10);
        console.log(${fnName}(a, b));
    }
}
_main();`;

  const cStarter = `#include <stdio.h>

${retType} ${fnName}(${params}) {
    // Return your answer here
    return 0;
}`;

  const cDriver = `int main() {
    int a, b;
    if (scanf("%d %d", &a, &b) == 2) {
        printf("%d\\n", ${fnName}(a, b));
    }
    return 0;
}`;

  return {
    starter: {
      cpp: cppStarter,
      python: pyStarter,
      java: javaStarter,
      javascript: jsStarter,
      c: cStarter,
    },
    driver: {
      cpp: cppDriver,
      python: pyDriver,
      java: javaDriver,
      javascript: jsDriver,
      c: cDriver,
    },
  };
}

type TestRow = {
  input: string;
  expectedOutput: string;
  isSample: boolean;
  position: number;
};

function emptyRow(position: number): TestRow {
  return { input: "", expectedOutput: "", isSample: position === 1, position };
}

function ModeratorForm({ slug }: { slug: string }) {
  const { showToast } = useToast();
  const [number, setNumber] = useState(1);
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [points, setPoints] = useState(100);
  const [type, setType] = useState("coding");
  const [testCases, setTestCases] = useState<TestRow[]>([emptyRow(1), emptyRow(2)]);
  const [saving, setSaving] = useState(false);
  const [existingProblems, setExistingProblems] = useState<ProblemSummary[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [jsonInput, setJsonInput] = useState("");
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Template and driver harness state
  const [templateStyle, setTemplateStyle] = useState<"leetcode" | "standard">("leetcode");
  const [starterCode, setStarterCode] = useState<Record<SupportedLanguage, string>>(DEFAULT_LEETCODE_STARTER);
  const [driverCode, setDriverCode] = useState<Record<SupportedLanguage, string>>(DEFAULT_LEETCODE_DRIVER);
  const [activeTemplateLang, setActiveTemplateLang] = useState<SupportedLanguage>("cpp");
  const [showGenHelper, setShowGenHelper] = useState(false);
  const [genFnName, setGenFnName] = useState("solve");
  const [genReturnType, setGenReturnType] = useState("int");
  const [genParams, setGenParams] = useState("int a, int b");

  const loadExisting = async () => {
    try {
      const [list, me] = await Promise.all([
        getProblems(slug).catch(() => []),
        getMe(slug).catch(() => null),
      ]);
      setExistingProblems(list);
      if (me) setCurrentUser(me);
      if (list.length > 0) {
        const maxNum = Math.max(...list.map((p) => p.number || 0));
        if (maxNum < 6) setNumber(maxNum + 1);
      }
    } catch {
      // Ignored
    }
  };

  useEffect(() => {
    rememberContest(slug);
    loadExisting();
  }, [slug]);

  const updateRow = (index: number, patch: Partial<TestRow>) => {
    setTestCases((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const removeRow = (index: number) => {
    if (testCases.length <= 1) {
      showToast("At least one test case is required.", "error");
      return;
    }
    setTestCases((rows) => rows.filter((_, i) => i !== index));
  };

  const handleJsonImport = () => {
    setJsonError(null);
    try {
      const parsed = JSON.parse(jsonInput.trim());
      if (!Array.isArray(parsed) || parsed.length === 0) {
        setJsonError("JSON must be a non-empty array of objects.");
        return;
      }
      const imported: TestRow[] = parsed.map((item: any, idx: number) => ({
        input: String(item.input ?? ""),
        expectedOutput: String(item.expectedOutput ?? item.output ?? "").trim(),
        isSample: typeof item.isSample === "boolean" ? item.isSample : idx === 0,
        position: idx + 1,
      }));

      // Validation: Must have at least one hidden test case
      if (!imported.some((tc) => !tc.isSample)) {
        imported[imported.length - 1].isSample = false;
      }

      setTestCases(imported);
      setShowJsonModal(false);
      setJsonInput("");
      showToast(`Imported ${imported.length} test cases from JSON.`, "info");
    } catch (err: any) {
      setJsonError(err?.message || "Invalid JSON syntax.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setJsonInput(content);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!testCases.some((tc) => !tc.isSample)) {
      showToast("A problem must have at least one hidden test case.", "error");
      return;
    }

    try {
      setSaving(true);

      const sanitizedNumber = parseInt(String(number), 10);
      const sanitizedPoints = parseInt(String(points), 10);

      if (isNaN(sanitizedNumber) || sanitizedNumber < 1 || sanitizedNumber > 6) {
        showToast("Problem number must be between 1 and 6.", "error");
        setSaving(false);
        return;
      }

      const formattedTestCases = testCases.map((tc, i) => ({
        input: String(tc.input ?? ""),
        expectedOutput: String(tc.expectedOutput ?? "").trim(),
        isSample: Boolean(tc.isSample),
        position: i + 1,
      }));

      // Validate starterCode and driverCode across all 5 languages
      const langs: SupportedLanguage[] = ["cpp", "python", "java", "javascript", "c"];
      for (const lang of langs) {
        if (!starterCode[lang] || starterCode[lang].trim().length === 0) {
          showToast(`Starter code is required for ${lang.toUpperCase()}.`, "error");
          setSaving(false);
          return;
        }
        if (!driverCode[lang] || driverCode[lang].trim().length === 0) {
          showToast(`Driver code harness is required for ${lang.toUpperCase()}.`, "error");
          setSaving(false);
          return;
        }
      }

      const created = await createProblem(slug, {
        number: sanitizedNumber,
        title: title.trim(),
        statement: statement.trim(),
        points: isNaN(sanitizedPoints) ? 100 : sanitizedPoints,
        type: type.trim() || "coding",
        starterCode,
        driverCode,
        testCases: formattedTestCases,
      });

      showToast(`Created Problem #${sanitizedNumber}: ${created.title}!`, "success");
      setTitle("");
      setStatement("");
      setTestCases([emptyRow(1), emptyRow(2)]);
      setStarterCode(templateStyle === "leetcode" ? DEFAULT_LEETCODE_STARTER : DEFAULT_STANDARD_STARTER);
      setDriverCode(templateStyle === "leetcode" ? DEFAULT_LEETCODE_DRIVER : DEFAULT_STANDARD_DRIVER);
      loadExisting();
    } catch (err) {
      let message =
        err instanceof ApiRequestError
          ? err.message
          : "Could not create the problem.";

      if (err instanceof ApiRequestError && err.status === 500) {
        message = `Internal server error (500): Problem #${number} may already exist for this contest, or the database rejected the entry. Try a different problem number (e.g. #${number < 6 ? number + 1 : 1}).`;
      }
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      breadcrumbs={[
        { label: titleFromSlug(slug), href: `/c/${encodeURIComponent(slug)}` },
        { label: "Moderator" },
      ]}
      slug={slug}
      user={
        currentUser || {
          name: "Moderator",
          email: "priyansh.workspace@gmail.com",
          role: "moderator",
        }
      }
    >
      <div className="space-y-6">
        <PageHeader
          title="Moderator Portal: Create Problem"
          subtitle="Contest staff route. Author problems with test cases and mandatory starter & driver harnesses."
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Main Form (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="text-xs space-y-1 block">
                    <span className="text-[#8b8b94] font-mono uppercase">Number (1–6)</span>
                    <input
                      type="number"
                      min={1}
                      max={6}
                      value={number}
                      onChange={(e) => setNumber(Number(e.target.value))}
                      className="w-full bg-[#111113] border border-[#26262b] rounded-md px-3 py-2 text-sm text-[#ededf0] focus:ring-2 focus:ring-[#6D4AFF]/40 focus:outline-none"
                    />
                  </label>
                  <label className="text-xs space-y-1 block">
                    <span className="text-[#8b8b94] font-mono uppercase">Points</span>
                    <input
                      type="number"
                      min={0}
                      value={points}
                      onChange={(e) => setPoints(Number(e.target.value))}
                      className="w-full bg-[#111113] border border-[#26262b] rounded-md px-3 py-2 text-sm text-[#ededf0] focus:ring-2 focus:ring-[#6D4AFF]/40 focus:outline-none"
                    />
                  </label>
                  <label className="text-xs space-y-1 block">
                    <span className="text-[#8b8b94] font-mono uppercase">Type</span>
                    <input
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full bg-[#111113] border border-[#26262b] rounded-md px-3 py-2 text-sm text-[#ededf0] focus:ring-2 focus:ring-[#6D4AFF]/40 focus:outline-none"
                    />
                  </label>
                </div>

                <label className="text-xs space-y-1 block">
                  <span className="text-[#8b8b94] font-mono uppercase">Problem Title</span>
                  <input
                    required
                    value={title}
                    placeholder="e.g. Maximum Subarray Parity"
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-[#111113] border border-[#26262b] rounded-md px-3 py-2 text-sm text-[#ededf0] focus:ring-2 focus:ring-[#6D4AFF]/40 focus:outline-none"
                  />
                </label>

                <label className="text-xs space-y-1 block">
                  <span className="text-[#8b8b94] font-mono uppercase">Problem Statement (Markdown / Text)</span>
                  <textarea
                    required
                    rows={8}
                    value={statement}
                    placeholder="Provide full description, input format, output format, and constraints..."
                    onChange={(e) => setStatement(e.target.value)}
                    className="w-full bg-[#111113] border border-[#26262b] rounded-md px-3 py-2 text-sm font-mono text-[#ededf0] focus:ring-2 focus:ring-[#6D4AFF]/40 focus:outline-none"
                  />
                </label>

                {/* Code Templates & Driver Harness Section */}
                <div className="space-y-4 pt-3 border-t border-[#26262b]">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono uppercase text-[#ededf0] font-semibold">
                          Code Templates &amp; Driver Harness
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#6D4AFF]/20 text-[#a78bfa] border border-[#6D4AFF]/30">
                          Mandatory
                        </span>
                      </div>
                      <p className="text-[11px] text-[#8b8b94] mt-0.5">
                        Contestants receive the Starter Code. The hidden Driver Harness runs on Judge0 to execute their function.
                      </p>
                    </div>

                    {/* Style Selector */}
                    <div className="flex items-center bg-[#0a0a0b] p-1 rounded-md border border-[#26262b] text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setTemplateStyle("leetcode");
                          setStarterCode(DEFAULT_LEETCODE_STARTER);
                          setDriverCode(DEFAULT_LEETCODE_DRIVER);
                        }}
                        className={`px-2.5 py-1 rounded transition-colors text-xs font-medium ${
                          templateStyle === "leetcode"
                            ? "bg-[#6D4AFF] text-white"
                            : "text-[#8b8b94] hover:text-[#ededf0]"
                        }`}
                      >
                        LeetCode Style
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTemplateStyle("standard");
                          setStarterCode(DEFAULT_STANDARD_STARTER);
                          setDriverCode(DEFAULT_STANDARD_DRIVER);
                        }}
                        className={`px-2.5 py-1 rounded transition-colors text-xs font-medium ${
                          templateStyle === "standard"
                            ? "bg-[#6D4AFF] text-white"
                            : "text-[#8b8b94] hover:text-[#ededf0]"
                        }`}
                      >
                        Standard I/O
                      </button>
                    </div>
                  </div>

                  {/* Quick Generator Accordion / Panel */}
                  {templateStyle === "leetcode" && (
                    <div className="p-3 rounded-md bg-[#17171a] border border-[#26262b] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#ededf0] font-medium flex items-center gap-1.5">
                          <span>⚡</span> Quick Generator
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowGenHelper(!showGenHelper)}
                          className="text-xs text-[#a78bfa] hover:text-[#c4b5fd]"
                        >
                          {showGenHelper ? "Hide Generator ▲" : "Customize Signature ▼"}
                        </button>
                      </div>

                      {showGenHelper && (
                        <div className="space-y-3 pt-2 border-t border-[#26262b]">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <label className="text-[11px] space-y-1 block">
                              <span className="text-[#8b8b94]">Function Name</span>
                              <input
                                value={genFnName}
                                onChange={(e) => setGenFnName(e.target.value)}
                                placeholder="solve"
                                className="w-full bg-[#0a0a0b] border border-[#26262b] rounded px-2 py-1 text-xs font-mono text-[#ededf0] focus:outline-none"
                              />
                            </label>
                            <label className="text-[11px] space-y-1 block">
                              <span className="text-[#8b8b94]">Return Type</span>
                              <input
                                value={genReturnType}
                                onChange={(e) => setGenReturnType(e.target.value)}
                                placeholder="int"
                                className="w-full bg-[#0a0a0b] border border-[#26262b] rounded px-2 py-1 text-xs font-mono text-[#ededf0] focus:outline-none"
                              />
                            </label>
                            <label className="text-[11px] space-y-1 block">
                              <span className="text-[#8b8b94]">Parameters</span>
                              <input
                                value={genParams}
                                onChange={(e) => setGenParams(e.target.value)}
                                placeholder="int a, int b"
                                className="w-full bg-[#0a0a0b] border border-[#26262b] rounded px-2 py-1 text-xs font-mono text-[#ededf0] focus:outline-none"
                              />
                            </label>
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              const res = buildLeetCodeTemplates(
                                genFnName.trim() || "solve",
                                genReturnType.trim() || "int",
                                genParams.trim() || "int a, int b"
                              );
                              setStarterCode(res.starter);
                              setDriverCode(res.driver);
                              showToast("Applied signature template across all 5 languages!", "success");
                            }}
                          >
                            Apply to All 5 Languages
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Language Tabs */}
                  <div className="flex items-center gap-1.5 border-b border-[#26262b] pb-2 overflow-x-auto">
                    {LANGUAGE_OPTIONS.map((lang) => {
                      const isFilled =
                        starterCode[lang.id]?.trim().length > 0 &&
                        driverCode[lang.id]?.trim().length > 0;
                      return (
                        <button
                          key={lang.id}
                          type="button"
                          onClick={() => setActiveTemplateLang(lang.id)}
                          className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors flex items-center gap-1.5 shrink-0 ${
                            activeTemplateLang === lang.id
                              ? "bg-[#6D4AFF] text-white font-medium"
                              : "bg-[#111113] text-[#8b8b94] hover:text-[#ededf0] border border-[#26262b]"
                          }`}
                        >
                          <span>{lang.label}</span>
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isFilled ? "bg-emerald-400" : "bg-rose-400"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Language Template & Driver Editors */}
                  <div className="space-y-4">
                    <label className="text-xs space-y-1.5 block">
                      <div className="flex items-center justify-between">
                        <span className="text-[#ededf0] font-mono font-medium">
                          Starter Code · {LANGUAGE_OPTIONS.find((l) => l.id === activeTemplateLang)?.label}
                        </span>
                        <span className="text-[11px] text-[#8b8b94]">
                          Contestant-visible starting skeleton
                        </span>
                      </div>
                      <textarea
                        required
                        rows={7}
                        value={starterCode[activeTemplateLang] || ""}
                        onChange={(e) =>
                          setStarterCode((prev) => ({
                            ...prev,
                            [activeTemplateLang]: e.target.value,
                          }))
                        }
                        className="w-full bg-[#0a0a0b] border border-[#26262b] rounded-md p-3 text-xs font-mono text-[#ededf0] focus:ring-1 focus:ring-[#6D4AFF] focus:outline-none leading-relaxed"
                      />
                    </label>

                    <label className="text-xs space-y-1.5 block">
                      <div className="flex items-center justify-between">
                        <span className="text-[#ededf0] font-mono font-medium">
                          Driver Harness · {LANGUAGE_OPTIONS.find((l) => l.id === activeTemplateLang)?.label}
                        </span>
                        <span className="text-[11px] text-[#a78bfa]">
                          Hidden runner (reads stdin &amp; prints return value)
                        </span>
                      </div>
                      <textarea
                        required
                        rows={7}
                        value={driverCode[activeTemplateLang] || ""}
                        onChange={(e) =>
                          setDriverCode((prev) => ({
                            ...prev,
                            [activeTemplateLang]: e.target.value,
                          }))
                        }
                        className="w-full bg-[#0a0a0b] border border-[#26262b] rounded-md p-3 text-xs font-mono text-[#a78bfa] focus:ring-1 focus:ring-[#6D4AFF] focus:outline-none leading-relaxed"
                      />
                    </label>
                  </div>
                </div>

                {/* Testcases section */}
                <div className="space-y-3 pt-2 border-t border-[#26262b]">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-mono uppercase text-[#8b8b94] block">
                        Test cases ({testCases.length})
                      </span>
                      <span className="text-[11px] text-[#5a5a63]">
                        At least 1 sample and 1 hidden test case required.
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowJsonModal(true)}
                      >
                        Import JSON Tests
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setTestCases((rows) => [...rows, emptyRow(rows.length + 1)])
                        }
                      >
                        + Add Test
                      </Button>
                    </div>
                  </div>

                  {/* JSON Import Modal / Panel */}
                  {showJsonModal && (
                    <div className="p-4 rounded-md border border-[#6D4AFF]/40 bg-[#17171a] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#ededf0]">
                          Import Test Cases from JSON
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowJsonModal(false)}
                          className="text-xs text-[#8b8b94] hover:text-[#ededf0]"
                        >
                          ✕ Close
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-[#8b8b94]">
                          <span>Paste JSON array or upload file:</span>
                          <input
                            type="file"
                            accept=".json,application/json"
                            onChange={handleFileUpload}
                            className="text-[11px] text-[#8b8b94]"
                          />
                        </div>
                        <textarea
                          rows={5}
                          value={jsonInput}
                          onChange={(e) => setJsonInput(e.target.value)}
                          placeholder='[&#10;  { "input": "2 3\n", "expectedOutput": "5", "isSample": true },&#10;  { "input": "10 20\n", "expectedOutput": "30", "isSample": false }&#10;]'
                          className="w-full bg-[#0a0a0b] border border-[#26262b] rounded-md p-2 text-xs font-mono text-[#ededf0] focus:ring-1 focus:ring-[#6D4AFF] focus:outline-none"
                        />
                        {jsonError && (
                          <div className="text-xs text-rose-400 font-mono">
                            {jsonError}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowJsonModal(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={handleJsonImport}
                        >
                          Apply Test Cases
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {testCases.map((tc, index) => (
                      <div
                        key={index}
                        className="p-3 rounded-md border border-[#26262b] bg-[#111113] space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-medium text-[#ededf0]">
                            Test Case #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeRow(index)}
                            className="text-xs text-rose-400 hover:text-rose-300 font-mono"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          <label className="text-xs space-y-1 block">
                            <span className="text-[#8b8b94]">Input</span>
                            <textarea
                              required
                              rows={3}
                              value={tc.input}
                              onChange={(e) => updateRow(index, { input: e.target.value })}
                              className="w-full bg-[#0a0a0b] border border-[#26262b] rounded-md px-2 py-1.5 font-mono text-xs text-[#ededf0] focus:outline-none"
                            />
                          </label>
                          <label className="text-xs space-y-1 block">
                            <span className="text-[#8b8b94]">Expected output</span>
                            <textarea
                              required
                              rows={3}
                              value={tc.expectedOutput}
                              onChange={(e) =>
                                updateRow(index, { expectedOutput: e.target.value })
                              }
                              className="w-full bg-[#0a0a0b] border border-[#26262b] rounded-md px-2 py-1.5 font-mono text-xs text-emerald-400 focus:outline-none"
                            />
                          </label>
                        </div>

                        <label className="text-xs flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={tc.isSample}
                            onChange={(e) => updateRow(index, { isSample: e.target.checked })}
                            className="rounded border-[#26262b] bg-[#0a0a0b] text-[#6D4AFF] focus:ring-0"
                          />
                          <span className={tc.isSample ? "text-emerald-400 font-medium" : "text-[#8b8b94]"}>
                            {tc.isSample
                              ? "Sample Test Case (Visible to participants in problem statement)"
                              : "Hidden Test Case (Used by judge for scoring, not visible to participants)"}
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3">
                  <Button type="submit" variant="primary" size="md" loading={saving} className="w-full sm:w-auto">
                    Publish Problem to Contest
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Side Column (1/3): Existing Problems List & Role Info */}
          <div className="space-y-5">
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-[#8b8b94]">
                  Contest Problems
                </span>
                <span className="text-xs font-mono text-[#a78bfa]">
                  {existingProblems.length}/6
                </span>
              </div>

              {existingProblems.length === 0 ? (
                <div className="space-y-2 text-xs text-[#8b8b94] leading-relaxed">
                  <p>
                    No problems visible yet. The backend only releases problems once the contest start time arrives (<code className="text-[#a78bfa] font-mono">startsAt &lt;= NOW()</code>).
                  </p>
                  <p className="text-[11px] text-[#5a5a63]">
                    If you created a problem in PostgreSQL, ensure <code className="text-[#ededf0] font-mono">&quot;startsAt&quot;</code> in the <code className="text-[#ededf0] font-mono">contests</code> table is set to a past time.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {existingProblems.map((p) => (
                    <div
                      key={p.id}
                      className="p-2.5 rounded-md border border-[#26262b] bg-[#17171a] flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-[#ededf0] truncate">
                          {p.letter}. {p.title}
                        </div>
                        <div className="text-[11px] font-mono text-[#8b8b94]">
                          {p.points} pts · {p.samples?.length || 0} sample(s)
                        </div>
                      </div>
                      <Link
                        href={`/c/${encodeURIComponent(slug)}/problems/${encodeURIComponent(p.id)}`}
                        className="text-xs text-[#a78bfa] hover:text-[#c4b5fd] font-medium shrink-0 ml-2"
                      >
                        View →
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="border border-dashed border-[#26262b] bg-[#111113]/60 space-y-2 text-xs">
              <span className="font-mono text-[#8b8b94] uppercase tracking-wider block text-[11px]">
                Moderator Access Note
              </span>
              <p className="text-[#8b8b94] leading-relaxed">
                Only users with <span className="font-mono text-[#ededf0]">role = &apos;moderator&apos;</span> in the{" "}
                <span className="font-mono text-[#ededf0]">contest_participants</span> table can create problems.
              </p>
              <p className="text-[#5a5a63] text-[11px] leading-relaxed">
                If the submit button gives 403, run in SQL:
                <br />
                <code className="text-[#ededf0] font-mono">
                  UPDATE contest_participants SET role = &apos;moderator&apos; WHERE &quot;contestId&quot; = ...;
                </code>
              </p>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function ModeratorProblemsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return (
    <SessionGate slug={slug}>
      <ModeratorForm slug={slug} />
    </SessionGate>
  );
}
