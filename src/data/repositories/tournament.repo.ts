import { db } from "@/data/db";

export async function findCurrentTournament() {
  return db.tournament.findUnique({
    where: { code: "FIFA_WC_2026" }
  });
}

export async function requireCurrentTournament() {
  const tournament = await findCurrentTournament();

  if (!tournament) {
    throw new Error("FIFA_WC_2026 tournament is not seeded.");
  }

  return tournament;
}

export async function findTournamentGroupsWithMatches(tournamentId: string) {
  return db.group.findMany({
    where: { tournamentId },
    orderBy: { code: "asc" },
    include: {
      slots: {
        orderBy: { slot: "asc" },
        include: { team: true }
      },
      matches: {
        where: { stage: "GROUP" },
        orderBy: { order: "asc" },
        include: {
          homeTeam: true,
          awayTeam: true
        }
      }
    }
  });
}
