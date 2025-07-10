-- CreateTable
CREATE TABLE "Client" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "phone" TEXT,
    "stripeCustomerId" TEXT,
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'inactive',
    "subscriptionExpiresAt" DATETIME,
    "botConfig" TEXT,
    "emailConfig" TEXT,
    "companyInfo" TEXT,
    "notificationConfig" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TwilioNumber" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "twilioSid" TEXT NOT NULL,
    "friendlyName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "originalNumber" TEXT,
    "region" TEXT,
    "capabilities" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TwilioNumber_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CallLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "twilioCallSid" TEXT NOT NULL,
    "callerNumber" TEXT NOT NULL,
    "callerName" TEXT,
    "callStatus" TEXT NOT NULL,
    "callDuration" INTEGER,
    "recordingUrl" TEXT,
    "transcription" TEXT,
    "aiSummary" TEXT,
    "aiClassification" TEXT,
    "urgencyLevel" TEXT,
    "callPurpose" TEXT,
    "contactInfo" TEXT,
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,
    "notifiedTo" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CallLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "messageId" TEXT NOT NULL,
    "fromAddress" TEXT NOT NULL,
    "fromName" TEXT,
    "toAddress" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyPlain" TEXT,
    "bodyHtml" TEXT,
    "attachments" TEXT,
    "aiSummary" TEXT,
    "aiClassification" TEXT,
    "forwardedTo" TEXT,
    "responseStatus" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EmailLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Analytics" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "totalCalls" INTEGER NOT NULL DEFAULT 0,
    "totalEmails" INTEGER NOT NULL DEFAULT 0,
    "missedCalls" INTEGER NOT NULL DEFAULT 0,
    "answeredCalls" INTEGER NOT NULL DEFAULT 0,
    "avgCallDuration" REAL NOT NULL DEFAULT 0,
    "emailsResponded" INTEGER NOT NULL DEFAULT 0,
    "emailsForwarded" INTEGER NOT NULL DEFAULT 0,
    "topCallCategories" TEXT,
    "topEmailCategories" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Analytics_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clientId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Notification_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Client_stripeCustomerId_key" ON "Client"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Client_email_idx" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Client_subscriptionStatus_idx" ON "Client"("subscriptionStatus");

-- CreateIndex
CREATE INDEX "Client_subscriptionExpiresAt_idx" ON "Client"("subscriptionExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TwilioNumber_phoneNumber_key" ON "TwilioNumber"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TwilioNumber_twilioSid_key" ON "TwilioNumber"("twilioSid");

-- CreateIndex
CREATE INDEX "TwilioNumber_clientId_idx" ON "TwilioNumber"("clientId");

-- CreateIndex
CREATE INDEX "TwilioNumber_phoneNumber_idx" ON "TwilioNumber"("phoneNumber");

-- CreateIndex
CREATE INDEX "TwilioNumber_status_idx" ON "TwilioNumber"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CallLog_twilioCallSid_key" ON "CallLog"("twilioCallSid");

-- CreateIndex
CREATE INDEX "CallLog_clientId_idx" ON "CallLog"("clientId");

-- CreateIndex
CREATE INDEX "CallLog_twilioCallSid_idx" ON "CallLog"("twilioCallSid");

-- CreateIndex
CREATE INDEX "CallLog_callerNumber_idx" ON "CallLog"("callerNumber");

-- CreateIndex
CREATE INDEX "CallLog_createdAt_idx" ON "CallLog"("createdAt");

-- CreateIndex
CREATE INDEX "CallLog_aiClassification_idx" ON "CallLog"("aiClassification");

-- CreateIndex
CREATE UNIQUE INDEX "EmailLog_messageId_key" ON "EmailLog"("messageId");

-- CreateIndex
CREATE INDEX "EmailLog_clientId_idx" ON "EmailLog"("clientId");

-- CreateIndex
CREATE INDEX "EmailLog_messageId_idx" ON "EmailLog"("messageId");

-- CreateIndex
CREATE INDEX "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");

-- CreateIndex
CREATE INDEX "EmailLog_fromAddress_idx" ON "EmailLog"("fromAddress");

-- CreateIndex
CREATE INDEX "Analytics_clientId_date_idx" ON "Analytics"("clientId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Analytics_clientId_date_key" ON "Analytics"("clientId", "date");

-- CreateIndex
CREATE INDEX "Notification_clientId_idx" ON "Notification"("clientId");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_status_idx" ON "Notification"("status");
