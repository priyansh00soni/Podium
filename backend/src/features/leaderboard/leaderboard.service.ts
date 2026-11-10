import { prisma } from "../../config/db.js";

export async function getLeaderboard(contestId: string) {
  // 1. Load active points rows, filtering out invalid problems and participants at the DB level
  const pointsRows = await prisma.point.findMany({
    where: { 
      contestId,
      problem: { status: 'active' },
      participant: { 
        role: 'participant', 
        disqualifiedAt: null, 
        deletedAt: null 
      }
    },
    include: {
      problem: true,
      participant: {
        include: { user: true } // Fetches the actual user record to read 'name'
      }
    }
  });

  const participantTotals = new Map<string, { name: string; total: number; lastSolveAt: number }>();

  // 2. Aggregate in code
  for (const row of pointsRows) {
    const participant = row.participant;
    const participantId = participant.id;

    const current = participantTotals.get(participantId) || {
      name: participant.user.name,
      total: 0,
      lastSolveAt: 0
    };

    current.total += row.points;
    
    // Track the latest first-accept time
    const rowTime = new Date(row.solveTime).getTime();
    if (rowTime > current.lastSolveAt) {
      current.lastSolveAt = rowTime;
    }

    participantTotals.set(participantId, current);
  }

  // 3. Sort: Total points DESC, then max solveTime ASC
  const board = Array.from(participantTotals.values()).sort((a, b) => {
    if (b.total !== a.total) {
      return b.total - a.total;
    }
    return a.lastSolveAt - b.lastSolveAt;
  });

  // 4. Format and assign rank
  return board.map((entry, index) => ({
    rank: index + 1,
    name: entry.name,
    total: entry.total,
    lastSolveAt: new Date(entry.lastSolveAt)
  }));
}