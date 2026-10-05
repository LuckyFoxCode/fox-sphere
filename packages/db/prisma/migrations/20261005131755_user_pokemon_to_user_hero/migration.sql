/*
  Warnings:

  - You are about to drop the `UserPokemon` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "UserPokemon" DROP CONSTRAINT "UserPokemon_userId_fkey";

-- DropTable
DROP TABLE "UserPokemon";

-- CreateTable
CREATE TABLE "UserHero" (
    "id" SERIAL NOT NULL,
    "heroId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserHero_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserHero_userId_key" ON "UserHero"("userId");

-- AddForeignKey
ALTER TABLE "UserHero" ADD CONSTRAINT "UserHero_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
