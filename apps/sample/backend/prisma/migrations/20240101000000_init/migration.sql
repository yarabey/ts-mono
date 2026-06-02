-- CreateTable
CREATE TABLE "GreetingTemplate" (
    "locale" TEXT NOT NULL,
    "template" TEXT NOT NULL,

    CONSTRAINT "GreetingTemplate_pkey" PRIMARY KEY ("locale")
);
