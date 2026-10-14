-- Persist real form-classification counts so Dashboard accuracy is computed
-- server-side from data instead of trusting a client-supplied scalar.

-- AlterTable
ALTER TABLE "Workout"
ADD COLUMN     "totalPredictions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "correctPredictions" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Workout_userId_completed_idx" ON "Workout"("userId", "completed");