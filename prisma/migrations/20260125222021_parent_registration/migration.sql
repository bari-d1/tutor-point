-- CreateTable
CREATE TABLE "ParentRegistration" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "studentYear" TEXT NOT NULL,
    "goals" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ParentRegistration_email_key" ON "ParentRegistration"("email");

-- CreateIndex
CREATE INDEX "ParentRegistration_email_idx" ON "ParentRegistration"("email");
