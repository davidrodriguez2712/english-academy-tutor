-- CreateTable
CREATE TABLE "Profile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActivityDate" DATETIME
);

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL,
    "rawText" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startPage" INTEGER NOT NULL,
    "endPage" INTEGER NOT NULL,
    "level" TEXT,
    "extractedText" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastOpenedAt" DATETIME,
    CONSTRAINT "Unit_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExerciseSet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExerciseSet_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExerciseAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "exerciseSetId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "totalCount" INTEGER NOT NULL,
    "xpEarned" INTEGER NOT NULL,
    "answers" TEXT NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ExerciseAttempt_exerciseSetId_fkey" FOREIGN KEY ("exerciseSetId") REFERENCES "ExerciseSet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SpeakingSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mode" TEXT NOT NULL,
    "unitId" TEXT,
    "topic" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "totalTurns" INTEGER NOT NULL,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpeakingSession_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SpeakingTurn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "assistantPrompt" TEXT NOT NULL,
    "assistantAudioPath" TEXT,
    "userAudioPath" TEXT,
    "userTranscript" TEXT,
    "correctedText" TEXT,
    "naturalVersion" TEXT,
    "fluencyTip" TEXT,
    "correctionAudioPath" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SpeakingTurn_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SpeakingSession" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ExerciseSet_unitId_type_key" ON "ExerciseSet"("unitId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "SpeakingTurn_sessionId_index_key" ON "SpeakingTurn"("sessionId", "index");
