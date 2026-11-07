import { Language } from "../../generated/prisma/enums.js";


export function getLanguageLimits(language: Language) {
    const limits: Record<Language, { time: number; memory: number }> = {
        c: { time: 1, memory: 256 },
        cpp: { time: 1, memory: 256 },
        java: { time: 2, memory: 256 },
        javascript: { time: 2, memory: 256 },
        python: { time: 3, memory: 256 },
    };
    return limits[language];
}