/*
  Warnings:

  - You are about to drop the column `googleAccessToken` on the `Atendente` table. All the data in the column will be lost.
  - You are about to drop the column `googleRefreshToken` on the `Atendente` table. All the data in the column will be lost.
  - You are about to drop the column `googleTokenExpiry` on the `Atendente` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Atendente" DROP COLUMN "googleAccessToken",
DROP COLUMN "googleRefreshToken",
DROP COLUMN "googleTokenExpiry";

-- CreateTable
CREATE TABLE "GoogleCredencial" (
    "id" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "atendenteId" TEXT NOT NULL,

    CONSTRAINT "GoogleCredencial_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCredencial_atendenteId_key" ON "GoogleCredencial"("atendenteId");

-- AddForeignKey
ALTER TABLE "GoogleCredencial" ADD CONSTRAINT "GoogleCredencial_atendenteId_fkey" FOREIGN KEY ("atendenteId") REFERENCES "Atendente"("id") ON DELETE CASCADE ON UPDATE CASCADE;
