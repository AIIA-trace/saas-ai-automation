-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyDescription" TEXT,
    "contactName" TEXT NOT NULL,
    "phone" TEXT,
    "position" TEXT,
    "apiKey" TEXT,
    "role" TEXT NOT NULL DEFAULT 'client',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "avatar" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "language" TEXT NOT NULL DEFAULT 'es',
    "industry" TEXT,
    "website" TEXT,
    "address" TEXT,
    "stripeCustomerId" TEXT,
    "defaultPaymentMethodId" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'trial',
    "subscriptionExpiresAt" TIMESTAMP(3),
    "trialEndDate" TIMESTAMP(3),
    "botLanguage" TEXT,
    "botName" TEXT,
    "botPersonality" TEXT,
    "welcomeMessage" TEXT,
    "confirmationMessage" TEXT,
    "subscriptionStatus" TEXT,
    "personality" TEXT,
    "emailConfig" JSONB,
    "callConfig" JSONB,
    "companyInfo" JSONB,
    "billingInfo" JSONB,
    "paymentMethods" JSONB,
    "notificationConfig" JSONB,
    "businessHoursConfig" JSONB,
    "faqs" JSONB,
    "contextFiles" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwilioNumber" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "twilioSid" TEXT NOT NULL,
    "friendlyName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "originalNumber" TEXT,
    "region" TEXT,
    "capabilities" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwilioNumber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallLog" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "callId" TEXT,
    "twilioCallSid" TEXT,
    "callerNumber" TEXT NOT NULL,
    "callerName" TEXT,
    "duration" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "recordingUrl" TEXT,
    "transcription" TEXT,
    "analysis" JSONB,
    "metadata" JSONB,
    "callStatus" TEXT,
    "callDuration" INTEGER,
    "aiSummary" TEXT,
    "aiClassification" TEXT,
    "urgencyLevel" TEXT,
    "callPurpose" TEXT,
    "contactInfo" TEXT,
    "managed" BOOLEAN NOT NULL DEFAULT false,
    "important" BOOLEAN NOT NULL DEFAULT false,
    "notificationSent" BOOLEAN NOT NULL DEFAULT false,
    "notifiedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailLog" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "emailId" TEXT,
    "messageId" TEXT,
    "fromAddress" TEXT NOT NULL,
    "fromName" TEXT,
    "toAddress" TEXT,
    "subject" TEXT,
    "body" TEXT,
    "analysis" JSONB,
    "response" TEXT,
    "status" TEXT NOT NULL DEFAULT 'processed',
    "metadata" JSONB,
    "bodyPlain" TEXT,
    "bodyHtml" TEXT,
    "attachments" TEXT,
    "aiSummary" TEXT,
    "aiClassification" TEXT,
    "forwardedTo" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "responseStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Analytics" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalCalls" INTEGER NOT NULL DEFAULT 0,
    "totalEmails" INTEGER NOT NULL DEFAULT 0,
    "missedCalls" INTEGER NOT NULL DEFAULT 0,
    "answeredCalls" INTEGER NOT NULL DEFAULT 0,
    "avgCallDuration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "emailsResponded" INTEGER NOT NULL DEFAULT 0,
    "emailsForwarded" INTEGER NOT NULL DEFAULT 0,
    "topCallCategories" TEXT,
    "topEmailCategories" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Client_apiKey_key" ON "Client"("apiKey");

-- CreateIndex
CREATE UNIQUE INDEX "Client_stripeCustomerId_key" ON "Client"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Client_email_idx" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Client_plan_idx" ON "Client"("plan");

-- CreateIndex
CREATE INDEX "Client_subscriptionExpiresAt_idx" ON "Client"("subscriptionExpiresAt");

-- CreateIndex
CREATE INDEX "Client_apiKey_idx" ON "Client"("apiKey");

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
CREATE INDEX "CallLog_clientId_idx" ON "CallLog"("clientId");

-- CreateIndex
CREATE INDEX "CallLog_callId_idx" ON "CallLog"("callId");

-- CreateIndex
CREATE INDEX "CallLog_twilioCallSid_idx" ON "CallLog"("twilioCallSid");

-- CreateIndex
CREATE INDEX "CallLog_callerNumber_idx" ON "CallLog"("callerNumber");

-- CreateIndex
CREATE INDEX "CallLog_createdAt_idx" ON "CallLog"("createdAt");

-- CreateIndex
CREATE INDEX "CallLog_status_idx" ON "CallLog"("status");

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

-- AddForeignKey
ALTER TABLE "TwilioNumber" ADD CONSTRAINT "TwilioNumber_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailLog" ADD CONSTRAINT "EmailLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Analytics" ADD CONSTRAINT "Analytics_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
