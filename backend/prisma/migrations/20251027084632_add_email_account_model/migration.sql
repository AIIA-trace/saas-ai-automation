-- CreateTable
CREATE TABLE "CallerMemory" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "callerPhone" TEXT NOT NULL,
    "callerName" TEXT,
    "callerCompany" TEXT,
    "lastCallDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "callCount" INTEGER NOT NULL DEFAULT 1,
    "conversationHistory" JSONB,
    "notes" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallerMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailAccount" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSync" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CallerMemory_clientId_idx" ON "CallerMemory"("clientId");

-- CreateIndex
CREATE INDEX "CallerMemory_callerPhone_idx" ON "CallerMemory"("callerPhone");

-- CreateIndex
CREATE INDEX "CallerMemory_expiresAt_idx" ON "CallerMemory"("expiresAt");

-- CreateIndex
CREATE INDEX "CallerMemory_lastCallDate_idx" ON "CallerMemory"("lastCallDate");

-- CreateIndex
CREATE UNIQUE INDEX "CallerMemory_clientId_callerPhone_key" ON "CallerMemory"("clientId", "callerPhone");

-- CreateIndex
CREATE INDEX "EmailAccount_clientId_idx" ON "EmailAccount"("clientId");

-- CreateIndex
CREATE INDEX "EmailAccount_provider_idx" ON "EmailAccount"("provider");

-- CreateIndex
CREATE INDEX "EmailAccount_isActive_idx" ON "EmailAccount"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "EmailAccount_clientId_email_key" ON "EmailAccount"("clientId", "email");

-- AddForeignKey
ALTER TABLE "EmailAccount" ADD CONSTRAINT "EmailAccount_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
