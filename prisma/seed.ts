import process from "node:process";
import { MatchStage, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import groupMatches from "./seed/fifa-2026/group-matches.json";
import groups from "./seed/fifa-2026/groups.json";
import knockoutTemplate from "./seed/fifa-2026/knockout-template.json";
import teams from "./seed/fifa-2026/teams.json";

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

type TeamSeed = (typeof teams)[number];
type GroupSeed = (typeof groups)[number];
type GroupMatchSeed = (typeof groupMatches)[number];
type KnockoutMatchSeed = (typeof knockoutTemplate)[number];

async function main() {
  const tournament = await prisma.tournament.upsert({
    where: { code: "FIFA_WC_2026" },
    create: {
      code: "FIFA_WC_2026",
      name: "FIFA World Cup 2026",
      startsAt: new Date("2026-06-11T00:00:00.000Z"),
      endsAt: new Date("2026-07-19T00:00:00.000Z"),
      dataVersion: "fifa-official-2026-04-26"
    },
    update: {
      name: "FIFA World Cup 2026",
      startsAt: new Date("2026-06-11T00:00:00.000Z"),
      endsAt: new Date("2026-07-19T00:00:00.000Z"),
      dataVersion: "fifa-official-2026-04-26"
    }
  });

  await prisma.tournamentControl.upsert({
    where: { tournamentId: tournament.id },
    create: {
      tournamentId: tournament.id,
      predictionsLocked: false
    },
    update: {}
  });

  const teamIdsByCode = await seedTeams(tournament.id, teams);
  const groupIdsByCode = await seedGroups(tournament.id, groups, teamIdsByCode);
  await seedGroupMatches(
    tournament.id,
    groupMatches,
    teamIdsByCode,
    groupIdsByCode
  );
  await seedKnockoutMatches(tournament.id, knockoutTemplate);

  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (adminUsername && adminPassword) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await prisma.user.upsert({
      where: { username: adminUsername },
      create: {
        username: adminUsername,
        passwordHash,
        role: "ADMIN"
      },
      update: {
        passwordHash,
        role: "ADMIN"
      }
    });
  }
}

async function seedTeams(tournamentId: string, teamSeeds: TeamSeed[]) {
  const idsByCode = new Map<string, string>();

  for (const team of teamSeeds) {
    const savedTeam = await prisma.team.upsert({
      where: {
        tournamentId_fifaCode: {
          tournamentId,
          fifaCode: team.fifaCode
        }
      },
      create: {
        tournamentId,
        fifaCode: team.fifaCode,
        name: team.name,
        shortName: team.shortName,
        flagCode: team.flagCode,
        fifaRankingSeed: team.fifaRankingSeed
      },
      update: {
        name: team.name,
        shortName: team.shortName,
        flagCode: team.flagCode,
        fifaRankingSeed: team.fifaRankingSeed
      }
    });

    idsByCode.set(team.id, savedTeam.id);
  }

  return idsByCode;
}

async function seedGroups(
  tournamentId: string,
  groupSeeds: GroupSeed[],
  teamIdsByCode: Map<string, string>
) {
  const idsByCode = new Map<string, string>();

  for (const group of groupSeeds) {
    const savedGroup = await prisma.group.upsert({
      where: {
        tournamentId_code: {
          tournamentId,
          code: group.code
        }
      },
      create: {
        tournamentId,
        code: group.code
      },
      update: {}
    });

    idsByCode.set(group.code, savedGroup.id);

    for (const [index, teamCode] of group.slots.entries()) {
      const teamId = requireSeedId(teamIdsByCode, teamCode, "team");

      await prisma.groupSlot.upsert({
        where: {
          groupId_slot: {
            groupId: savedGroup.id,
            slot: index + 1
          }
        },
        create: {
          groupId: savedGroup.id,
          slot: index + 1,
          teamId
        },
        update: {
          teamId
        }
      });
    }
  }

  return idsByCode;
}

async function seedGroupMatches(
  tournamentId: string,
  matchSeeds: GroupMatchSeed[],
  teamIdsByCode: Map<string, string>,
  groupIdsByCode: Map<string, string>
) {
  for (const [index, match] of matchSeeds.entries()) {
    const groupId = requireSeedId(groupIdsByCode, match.groupCode, "group");
    const homeTeamId = requireSeedId(teamIdsByCode, match.home, "team");
    const awayTeamId = requireSeedId(teamIdsByCode, match.away, "team");

    await prisma.match.upsert({
      where: {
        tournamentId_matchNo: {
          tournamentId,
          matchNo: match.matchNo
        }
      },
      create: {
        tournamentId,
        matchNo: match.matchNo,
        stage: "GROUP",
        groupId,
        homeSource: match.home,
        awaySource: match.away,
        homeTeamId,
        awayTeamId,
        kickoffAt: null,
        venue: match.venue,
        order: index + 1
      },
      update: {
        stage: "GROUP",
        groupId,
        homeSource: match.home,
        awaySource: match.away,
        homeTeamId,
        awayTeamId,
        kickoffAt: null,
        venue: match.venue,
        order: index + 1
      }
    });
  }
}

async function seedKnockoutMatches(
  tournamentId: string,
  matchSeeds: KnockoutMatchSeed[]
) {
  for (const match of matchSeeds) {
    await prisma.match.upsert({
      where: {
        tournamentId_matchNo: {
          tournamentId,
          matchNo: match.matchNo
        }
      },
      create: {
        tournamentId,
        matchNo: match.matchNo,
        stage: match.stage as MatchStage,
        groupId: null,
        homeSource: match.homeSource,
        awaySource: match.awaySource,
        homeTeamId: null,
        awayTeamId: null,
        kickoffAt: null,
        venue: null,
        order: match.order
      },
      update: {
        stage: match.stage as MatchStage,
        groupId: null,
        homeSource: match.homeSource,
        awaySource: match.awaySource,
        homeTeamId: null,
        awayTeamId: null,
        kickoffAt: null,
        venue: null,
        order: match.order
      }
    });
  }
}

function requireSeedId(
  idsByCode: Map<string, string>,
  code: string,
  entityName: string
) {
  const id = idsByCode.get(code);

  if (!id) {
    throw new Error(`Missing ${entityName} seed for code ${code}`);
  }

  return id;
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
