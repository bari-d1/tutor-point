/*
  Warnings:

  - You are about to drop the column `email` on the `ParentRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `fullName` on the `ParentRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `goals` on the `ParentRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `ParentRegistration` table. All the data in the column will be lost.
  - You are about to drop the column `studentYear` on the `ParentRegistration` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[parentEmail]` on the table `ParentRegistration` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `childClass` to the `ParentRegistration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `childName` to the `ParentRegistration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `parentEmail` to the `ParentRegistration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `parentName` to the `ParentRegistration` table without a default value. This is not possible if the table is not empty.
  - Added the required column `parentPhone` to the `ParentRegistration` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ParentRegistration_email_idx";

-- DropIndex
DROP INDEX "ParentRegistration_email_key";

-- AlterTable
ALTER TABLE "ParentRegistration" DROP COLUMN "email",
DROP COLUMN "fullName",
DROP COLUMN "goals",
DROP COLUMN "phone",
DROP COLUMN "studentYear",
ADD COLUMN     "childClass" TEXT NOT NULL,
ADD COLUMN     "childName" TEXT NOT NULL,
ADD COLUMN     "examType" TEXT,
ADD COLUMN     "parentEmail" TEXT NOT NULL,
ADD COLUMN     "parentName" TEXT NOT NULL,
ADD COLUMN     "parentPhone" TEXT NOT NULL,
ADD COLUMN     "support" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ParentRegistration_parentEmail_key" ON "ParentRegistration"("parentEmail");

-- CreateIndex
CREATE INDEX "ParentRegistration_parentEmail_idx" ON "ParentRegistration"("parentEmail");
