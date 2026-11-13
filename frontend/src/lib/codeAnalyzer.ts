import type { SupportedLanguage, Verdict } from "./api";

export interface CodeDiagnostic {
  hasError: boolean;
  verdict: Verdict;
  line?: number;
  message: string;
  detail?: string;
}

export function analyzeCode(code: string, language: SupportedLanguage): CodeDiagnostic | null {
  const trimmed = code.trim();
  if (!trimmed) {
    return {
      hasError: true,
      verdict: "compile_error",
      line: 1,
      message: "Source code is empty.",
      detail: "Line 1: error: empty source file submitted.",
    };
  }

  const lines = code.split("\n");

  // 1. Language-Specific: JavaScript
  if (language === "javascript") {
    try {
      new Function(code);
    } catch (err: any) {
      const msg = err?.message || "Syntax error in JavaScript code.";
      let lineNum = 1;
      const stack = String(err?.stack || "");
      const match = stack.match(/<anonymous>:(\d+):(\d+)/) || stack.match(/:(\d+):(\d+)/);
      if (match) {
        lineNum = Math.max(1, parseInt(match[1], 10) - 2); // Function wrapper offset
      }
      const errorLine = lines[lineNum - 1] || "";
      return {
        hasError: true,
        verdict: "compile_error",
        line: lineNum,
        message: `SyntaxError: ${msg}`,
        detail: `Line ${lineNum}: SyntaxError: ${msg}\n  ${lineNum} | ${errorLine.trim()}\n    | ^`,
      };
    }
  }

  // 2. Language-Specific: Python
  if (language === "python") {
    // Check for common JavaScript-isms in Python
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("#")) continue;

      // Division by zero
      if (/\/\s*0\b/.test(trimmedLine) || /%\s*0\b/.test(trimmedLine)) {
        return {
          hasError: true,
          verdict: "runtime_error",
          line: lineNum,
          message: "ZeroDivisionError: integer division or modulo by zero",
          detail: `Line ${lineNum}: ZeroDivisionError: integer division or modulo by zero\n  ${lineNum} | ${trimmedLine}\n    | ^`,
        };
      }

      // Check for === or !==
      if (trimmedLine.includes("===") || trimmedLine.includes("!==")) {
        return {
          hasError: true,
          verdict: "compile_error",
          line: lineNum,
          message: "SyntaxError: invalid syntax ('===' or '!==' does not exist in Python; use '==' or '!=')",
          detail: `Line ${lineNum}: SyntaxError: invalid syntax\n  ${lineNum} | ${trimmedLine}\n    | ^`,
        };
      }

      // Check for && or ||
      if (/\s&&\s/.test(trimmedLine) || /\s\|\|\s/.test(trimmedLine)) {
        return {
          hasError: true,
          verdict: "compile_error",
          line: lineNum,
          message: "SyntaxError: invalid syntax (use 'and' / 'or' instead of '&&' / '||')",
          detail: `Line ${lineNum}: SyntaxError: invalid syntax\n  ${lineNum} | ${trimmedLine}\n    | ^`,
        };
      }

      // Check for missing colons on compound statements
      const compoundMatch = trimmedLine.match(/^(def\s+\w+.*|class\s+\w+.*|if\s+.*|elif\s+.*|else|for\s+.*|while\s+.*|try|except.*|finally|with\s+.*)$/);
      if (compoundMatch && !trimmedLine.endsWith(":")) {
        // Exclude lines with inline comments ending in :
        if (!trimmedLine.split("#")[0].trim().endsWith(":")) {
          return {
            hasError: true,
            verdict: "compile_error",
            line: lineNum,
            message: `SyntaxError: expected ':' at end of line`,
            detail: `Line ${lineNum}: SyntaxError: expected ':' at end of compound statement\n  ${lineNum} | ${trimmedLine}\n    | ${" ".repeat(trimmedLine.length)}^ expected ':' here`,
          };
        }
      }

      // Check for unclosed print without parens (Python 2 print)
      if (/^print\s+["'].*["']$/.test(trimmedLine)) {
        return {
          hasError: true,
          verdict: "compile_error",
          line: lineNum,
          message: "SyntaxError: Missing parentheses in call to 'print'. Did you mean print(...) ?",
          detail: `Line ${lineNum}: SyntaxError: Missing parentheses in call to 'print'\n  ${lineNum} | ${trimmedLine}`,
        };
      }
    }
  }

  // 3. Language-Specific: C and C++
  if (language === "c" || language === "cpp") {
    let hasMain = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("//") || trimmedLine.startsWith("/*") || trimmedLine.startsWith("*")) continue;

      if (/\bmain\s*\(/.test(trimmedLine)) {
        hasMain = true;
      }

      // Check missing semicolons on declarations or assignments
      if (
        /^(int|long|double|float|char|bool|string|auto|return|cin|cout)\s+/.test(trimmedLine) &&
        !trimmedLine.endsWith(";") &&
        !trimmedLine.endsWith("{") &&
        !trimmedLine.endsWith("}") &&
        !trimmedLine.endsWith(",") &&
        !trimmedLine.endsWith(":") &&
        !trimmedLine.startsWith("#")
      ) {
        return {
          hasError: true,
          verdict: "compile_error",
          line: lineNum,
          message: "error: expected ';' at end of statement",
          detail: `Line ${lineNum}: error: expected ';' before end of line\n  ${lineNum} | ${trimmedLine}\n    | ${" ".repeat(trimmedLine.length)}^ missing ';'`,
        };
      }
    }

    if (!hasMain) {
      return {
        hasError: true,
        verdict: "compile_error",
        line: lines.length,
        message: "error: undefined reference to 'main'",
        detail: `linker error: in function '_start': undefined reference to 'main'`,
      };
    }
  }

  // 4. Language-Specific: Java
  if (language === "java") {
    let hasClass = false;
    let hasMain = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith("//") || trimmedLine.startsWith("/*") || trimmedLine.startsWith("*")) continue;

      if (/\bclass\s+\w+/.test(trimmedLine)) hasClass = true;
      if (/\bpublic\s+static\s+void\s+main\b/.test(trimmedLine) || /\bvoid\s+main\b/.test(trimmedLine)) hasMain = true;

      // Check missing semicolons
      if (
        /^(int|long|double|float|char|boolean|String|return|System\.out\.print)/.test(trimmedLine) &&
        !trimmedLine.endsWith(";") &&
        !trimmedLine.endsWith("{") &&
        !trimmedLine.endsWith("}")
      ) {
        return {
          hasError: true,
          verdict: "compile_error",
          line: lineNum,
          message: "error: ';' expected",
          detail: `Line ${lineNum}: error: ';' expected\n  ${lineNum} | ${trimmedLine}\n    | ${" ".repeat(trimmedLine.length)}^`,
        };
      }
    }

    if (!hasClass) {
      return {
        hasError: true,
        verdict: "compile_error",
        line: 1,
        message: "error: class, interface, or enum expected",
        detail: `Line 1: error: class expected\nJava programs must declare a class (e.g. 'public class Main')`,
      };
    }

    if (!hasMain) {
      return {
        hasError: true,
        verdict: "compile_error",
        line: 1,
        message: "error: Main method not found in class",
        detail: `error: Main method not found in class, please define the main method as:\n   public static void main(String[] args)`,
      };
    }
  }

  // 5. Generic Bracket Balance Check (across all languages)
  const bracketStack: { char: string; line: number }[] = [];
  const openPairs: Record<string, string> = { "(": ")", "[": "]", "{": "}" };
  const closePairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };

  let inString: string | null = null;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      const prev = c > 0 ? line[c - 1] : "";

      // Skip comments
      if (!inString && ch === "/" && line[c + 1] === "/") break;
      if (!inString && ch === "#" && language === "python") break;

      // Quote handling
      if ((ch === '"' || ch === "'") && prev !== "\\") {
        if (!inString) {
          inString = ch;
        } else if (inString === ch) {
          inString = null;
        }
        continue;
      }

      if (inString) continue;

      if (openPairs[ch]) {
        bracketStack.push({ char: ch, line: lineNum });
      } else if (closePairs[ch]) {
        const expectedOpen = closePairs[ch];
        if (bracketStack.length === 0) {
          return {
            hasError: true,
            verdict: "compile_error",
            line: lineNum,
            message: `SyntaxError: unmatched closing '${ch}' on line ${lineNum}`,
            detail: `Line ${lineNum}: SyntaxError: unmatched closing '${ch}'\n  ${lineNum} | ${line.trim()}\n    | ^`,
          };
        }
        const last = bracketStack.pop()!;
        if (last.char !== expectedOpen) {
          return {
            hasError: true,
            verdict: "compile_error",
            line: lineNum,
            message: `SyntaxError: mismatched brackets: opened with '${last.char}' on line ${last.line}, closed with '${ch}' on line ${lineNum}`,
            detail: `Line ${lineNum}: SyntaxError: closing '${ch}' does not match opening '${last.char}' from line ${last.line}`,
          };
        }
      }
    }
  }

  if (bracketStack.length > 0) {
    const unclosed = bracketStack[bracketStack.length - 1];
    return {
      hasError: true,
      verdict: "compile_error",
      line: unclosed.line,
      message: `SyntaxError: unclosed '${unclosed.char}' opened on line ${unclosed.line}`,
      detail: `Line ${unclosed.line}: SyntaxError: unclosed '${unclosed.char}'\n  ${unclosed.line} | ${lines[unclosed.line - 1]?.trim() || ""}\n    | ^ expected '${openPairs[unclosed.char]}'`,
    };
  }

  return null;
}

