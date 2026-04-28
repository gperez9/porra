-- CreateTable
CREATE TABLE "ActualMatchResult" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "homeGoals" INTEGER,
    "awayGoals" INTEGER,
    "decidedByPenalties" BOOLEAN NOT NULL DEFAULT false,
    "penaltyWinnerTeamId" TEXT,
    "qualifiedTeamId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActualMatchResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ActualMatchResult_matchId_key" ON "ActualMatchResult"("matchId");

-- CreateIndex
CREATE INDEX "ActualMatchResult_qualifiedTeamId_idx" ON "ActualMatchResult"("qualifiedTeamId");

-- CreateIndex
CREATE INDEX "ActualMatchResult_penaltyWinnerTeamId_idx" ON "ActualMatchResult"("penaltyWinnerTeamId");

-- CreateIndex
CREATE INDEX "ActualMatchResult_updatedByUserId_idx" ON "ActualMatchResult"("updatedByUserId");

-- AddForeignKey
ALTER TABLE "ActualMatchResult" ADD CONSTRAINT "ActualMatchResult_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualMatchResult" ADD CONSTRAINT "ActualMatchResult_penaltyWinnerTeamId_fkey" FOREIGN KEY ("penaltyWinnerTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualMatchResult" ADD CONSTRAINT "ActualMatchResult_qualifiedTeamId_fkey" FOREIGN KEY ("qualifiedTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActualMatchResult" ADD CONSTRAINT "ActualMatchResult_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
