import process from "node:process";
import { PrismaClient } from "@prisma/client";

try {
  process.loadEnvFile?.(".env");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
    throw error;
  }
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

const expectedCounts = {
  teams: 48,
  groups: 12,
  groupSlots: 48,
  groupMatches: 72,
  knockoutMatches: 32
};

async function main() {
  const tournament = await prisma.tournament.findUnique({
    where: { code: "FIFA_WC_2026" }
  });

  if (!tournament) {
    throw new Error("FIFA_WC_2026 tournament was not seeded.");
  }

  const [teams, groups, groupSlots, groupMatches, knockoutMatches, control] =
    await Promise.all([
      prisma.team.count({ where: { tournamentId: tournament.id } }),
      prisma.group.count({ where: { tournamentId: tournament.id } }),
      prisma.groupSlot.count({
        where: { group: { tournamentId: tournament.id } }
      }),
      prisma.match.count({
        where: { tournamentId: tournament.id, stage: "GROUP" }
      }),
      prisma.match.count({
        where: { tournamentId: tournament.id, stage: { not: "GROUP" } }
      }),
      prisma.tournamentControl.findUnique({
        where: { tournamentId: tournament.id }
      })
    ]);

  assertCount("teams", teams, expectedCounts.teams);
  assertCount("groups", groups, expectedCounts.groups);
  assertCount("group slots", groupSlots, expectedCounts.groupSlots);
  assertCount("group matches", groupMatches, expectedCounts.groupMatches);
  assertCount(
    "knockout matches",
    knockoutMatches,
    expectedCounts.knockoutMatches
  );

  if (!control) {
    throw new Error("Tournament control row was not seeded.");
  }

  console.log(
    [
      "Local database is ready:",
      `${teams} teams`,
      `${groups} groups`,
      `${groupSlots} group slots`,
      `${groupMatches} group matches`,
      `${knockoutMatches} knockout matches`
    ].join(" ")
  );
}

function assertCount(label: string, actual: number, expected: number) {
  if (actual !== expected) {
    throw new Error(`Expected ${expected} ${label}, found ${actual}.`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
