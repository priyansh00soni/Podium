import { prisma } from "../../config/db.js";

export const createProblemWithTests = async (
    contestId: string,
    problemData: any,
    testCases: any[]
) => {
    // Transaction: Create problem and nested test cases simultaneously
    const problem = await prisma.problem.create({
        data: {
            contestId: contestId,
            number: problemData.number,
            title: problemData.title,
            statement: problemData.statement,
            points: problemData.points,
            type: problemData.type,
            status: "active", // Default status for new problems
            
            // Map over the array to create the nested test cases
            testCases: {
                create: testCases.map(tc => ({
                    input: tc.input,
                    expectedOutput: tc.expectedOutput.trim(), // Crucial: Trim trailing spaces for Judge0
                    isSample: tc.isSample,
                    position: tc.position
                }))
            }
        },
        // Select what the frontend needs to confirm creation
        select: {
            id: true,
            title: true,
            testCases: {
                select: { 
                    id: true, 
                    isSample: true 
                }
            }
        }
    });

    return problem;
};