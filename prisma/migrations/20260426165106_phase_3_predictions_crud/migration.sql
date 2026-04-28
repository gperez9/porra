-- CreateEnum
CREATE TYPE "PredictionStatus" AS ENUM ('DRAFT', 'COMPLETE', 'LOCKED');

-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "PredictionStatus" NOT NULL DEFAULT 'DRAFT',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictedMatchResult" (
    "id" TEXT NOT NULL,
    "predictionId" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "homeGoals" INTEGER,
    "awayGoals" INTEGER,
    "homeExtraTimeGoals" INTEGER,
    "awayExtraTimeGoals" INTEGER,
    "decidedByPenalties" BOOLEAN NOT NULL DEFAULT false,
    "penaltyWinnerTeamId" TEXT,
    "qualifiedTeamId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PredictedMatchResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Prediction_userId_idx" ON "Prediction"("userId");

-- CreateIndex
CREATE INDEX "Prediction_tournamentId_idx" ON "Prediction"("tournamentId");

-- CreateIndex
CREATE INDEX "Prediction_userId_updatedAt_idx" ON "Prediction"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "PredictedMatchResult_matchId_idx" ON "PredictedMatchResult"("matchId");

-- CreateIndex
CREATE INDEX "PredictedMatchResult_penaltyWinnerTeamId_idx" ON "PredictedMatchResult"("penaltyWinnerTeamId");

-- CreateIndex
CREATE INDEX "PredictedMatchResult_qualifiedTeamId_idx" ON "PredictedMatchResult"("qualifiedTeamId");

-- CreateIndex
CREATE UNIQUE INDEX "PredictedMatchResult_predictionId_matchId_key" ON "PredictedMatchResult"("predictionId", "matchId");

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictedMatchResult" ADD CONSTRAINT "PredictedMatchResult_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "Prediction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictedMatchResult" ADD CONSTRAINT "PredictedMatchResult_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictedMatchResult" ADD CONSTRAINT "PredictedMatchResult_penaltyWinnerTeamId_fkey" FOREIGN KEY ("penaltyWinnerTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PredictedMatchResult" ADD CONSTRAINT "PredictedMatchResult_qualifiedTeamId_fkey" FOREIGN KEY ("qualifiedTeamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
