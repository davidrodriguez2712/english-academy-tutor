-- AlterTable
ALTER TABLE "SpeakingTurn" DROP COLUMN "correctionAudioPath";
ALTER TABLE "SpeakingTurn" ADD COLUMN "naturalAudioPath" TEXT;

-- AlterTable
ALTER TABLE "VocabEntry" ADD COLUMN "category" TEXT;
