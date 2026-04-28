-- CreateTable
CREATE TABLE "PredictionScore" (
    "id" TEXT NOT NULL,
    "predictionId" TEXT NOT NULL,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "breakdown" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PredictionScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PredictionScore_predictionId_key" ON "PredictionScore"("predictionId");

-- CreateIndex
CREATE INDEX "PredictionScore_totalPoints_idx" ON "PredictionScore"("totalPoints");

-- AddForeignKey
ALTER TABLE "PredictionScore" ADD CONSTRAINT "PredictionScore_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "Prediction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
