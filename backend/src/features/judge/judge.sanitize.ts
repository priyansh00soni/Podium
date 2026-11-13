/**
 * Sanitizes compiler outputs so contestants cannot inspect lines or structure of the hidden driver harness.
 */
// When users submit code, the platform usually appends hidden code to test their solution. If the combined code fails to compile, the raw compiler errors could expose the line numbers, variable names, or logic of the hidden tests. This function scrubs the compiler output to prevent that.
export function sanitizeCompileOutput(
    compileOutput: string | null | undefined,
    userCode: string
): string | null {
    if (!compileOutput || typeof compileOutput !== "string") return null;

    const userLines = userCode.split("\n").length;
    const lines = compileOutput.split("\n");

    const sanitizedLines = lines.map((line) => {
        // Match line numbers in gcc/clang/javac error format: ":<line>:<col>:" or ":<line>:"
        const match = line.match(/:(\d+):/);
        if (match) {
            const lineNum = parseInt(match[1], 10);
            if (lineNum > userLines + 1) {
                return "[Error during test harness execution - please verify your function name, parameters, and return type]";
            }
        }

        if (
            line.includes("HIDDEN DRIVER HARNESS") ||
            line.includes("driverCode") ||
            line.includes("_run")
        ) {
            return "[Error during test execution harness]";
        }

        return line;
    });

    return sanitizedLines.join("\n");
}

