-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('feeding', 'sleep', 'diaper', 'growth', 'health', 'milestone', 'note', 'pumping', 'bath', 'walk', 'weight', 'mood');

-- CreateEnum
CREATE TYPE "Source" AS ENUM ('miniapp', 'telegram', 'alice', 'telegram_voice', 'ai_parsed', 'test', 'csv_import', 'realm_import');

-- CreateEnum
CREATE TYPE "RawEntryStatus" AS ENUM ('pending', 'processing', 'processed', 'error', 'needs_review');

-- CreateEnum
CREATE TYPE "FeedingType" AS ENUM ('breast', 'bottle', 'solid', 'mixed', 'water');

-- CreateEnum
CREATE TYPE "BreastSide" AS ENUM ('left', 'right', 'both');

-- CreateEnum
CREATE TYPE "SleepType" AS ENUM ('night', 'nap');

-- CreateEnum
CREATE TYPE "SleepQuality" AS ENUM ('good', 'normal', 'bad');

-- CreateEnum
CREATE TYPE "DiaperType" AS ENUM ('wet', 'dirty', 'mixed');

-- CreateEnum
CREATE TYPE "HealthType" AS ENUM ('temperature', 'vaccination', 'doctor', 'medication', 'illness');

-- CreateEnum
CREATE TYPE "MilestoneCategory" AS ENUM ('motor', 'speech', 'social', 'cognitive');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('parent', 'admin');

-- CreateEnum
CREATE TYPE "EventRawEntryRole" AS ENUM ('created', 'updated');

-- CreateTable
CREATE TABLE "children" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "birth_date" TIMESTAMP(3) NOT NULL,
    "gender" "Gender",
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "telegram_id" BIGINT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "username" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'parent',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" SERIAL NOT NULL,
    "child_id" INTEGER NOT NULL,
    "event_type" "EventType" NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "source" "Source" NOT NULL,
    "author" TEXT,
    "note" TEXT,
    "raw_entry_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_feedings" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "feeding_type" "FeedingType" NOT NULL,
    "breast_side" "BreastSide",
    "duration_min" INTEGER,
    "left_duration_min" INTEGER,
    "right_duration_min" INTEGER,
    "amount_ml" DOUBLE PRECISION,
    "food_name" TEXT,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "event_feedings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_sleep" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "sleep_type" "SleepType",
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "duration_min" INTEGER,
    "quality" "SleepQuality",

    CONSTRAINT "event_sleep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_diapers" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "diaper_type" "DiaperType" NOT NULL,
    "color" TEXT,

    CONSTRAINT "event_diapers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_growth" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "height_cm" DOUBLE PRECISION,
    "head_circumference_cm" DOUBLE PRECISION,

    CONSTRAINT "event_growth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_weight" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "event_weight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_walks" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "duration_min" INTEGER,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "event_walks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_health" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "health_type" "HealthType" NOT NULL,
    "value" DOUBLE PRECISION,
    "doctor_name" TEXT,
    "vaccine_name" TEXT,
    "medication" TEXT,
    "description" TEXT,

    CONSTRAINT "event_health_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_milestones" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "category" "MilestoneCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "event_milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_pumping" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "breast_side" "BreastSide",
    "amount_ml" DOUBLE PRECISION,
    "duration_min" INTEGER,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "event_pumping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_baths" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER NOT NULL,
    "duration_min" INTEGER,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),

    CONSTRAINT "event_baths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "raw_entries" (
    "id" SERIAL NOT NULL,
    "source" "Source" NOT NULL,
    "author" TEXT,
    "text" TEXT NOT NULL,
    "file_path" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "status" "RawEntryStatus" NOT NULL DEFAULT 'pending',
    "parsed_events" INTEGER,
    "error_message" TEXT,
    "emoji" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "raw_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_raw_entries" (
    "event_id" INTEGER NOT NULL,
    "raw_entry_id" INTEGER NOT NULL,
    "role" "EventRawEntryRole" NOT NULL DEFAULT 'created',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_raw_entries_pkey" PRIMARY KEY ("event_id","raw_entry_id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" SERIAL NOT NULL,
    "event_id" INTEGER,
    "telegram_file_id" TEXT,
    "local_path" TEXT,
    "caption" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "csv_imports" (
    "unique_key" TEXT NOT NULL,
    "event_id" INTEGER,
    "file_name" TEXT NOT NULL,
    "row_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "csv_imports_pkey" PRIMARY KEY ("unique_key")
);

-- CreateTable
CREATE TABLE "csv_import_state" (
    "file_name" TEXT NOT NULL,
    "last_mtime_ms" BIGINT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "csv_import_state_pkey" PRIMARY KEY ("file_name")
);

-- CreateTable
CREATE TABLE "realm_imports" (
    "realm_id" TEXT NOT NULL,
    "event_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "realm_imports_pkey" PRIMARY KEY ("realm_id")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "user_id" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id","key")
);

-- CreateTable
CREATE TABLE "authorized_chats" (
    "chat_id" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "authorized_chats_pkey" PRIMARY KEY ("chat_id")
);

-- CreateTable
CREATE TABLE "timers" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "details" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "child_id" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "timers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegram_id_key" ON "users"("telegram_id");

-- CreateIndex
CREATE INDEX "events_child_id_occurred_at_idx" ON "events"("child_id", "occurred_at");

-- CreateIndex
CREATE INDEX "events_event_type_idx" ON "events"("event_type");

-- CreateIndex
CREATE INDEX "events_child_id_event_type_occurred_at_idx" ON "events"("child_id", "event_type", "occurred_at");

-- CreateIndex
CREATE INDEX "events_raw_entry_id_idx" ON "events"("raw_entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_feedings_event_id_key" ON "event_feedings"("event_id");

-- CreateIndex
CREATE INDEX "event_feedings_started_at_idx" ON "event_feedings"("started_at");

-- CreateIndex
CREATE UNIQUE INDEX "event_sleep_event_id_key" ON "event_sleep"("event_id");

-- CreateIndex
CREATE INDEX "event_sleep_started_at_idx" ON "event_sleep"("started_at");

-- CreateIndex
CREATE UNIQUE INDEX "event_diapers_event_id_key" ON "event_diapers"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_growth_event_id_key" ON "event_growth"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_weight_event_id_key" ON "event_weight"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_walks_event_id_key" ON "event_walks"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_health_event_id_key" ON "event_health"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_milestones_event_id_key" ON "event_milestones"("event_id");

-- CreateIndex
CREATE UNIQUE INDEX "event_pumping_event_id_key" ON "event_pumping"("event_id");

-- CreateIndex
CREATE INDEX "event_pumping_started_at_idx" ON "event_pumping"("started_at");

-- CreateIndex
CREATE UNIQUE INDEX "event_baths_event_id_key" ON "event_baths"("event_id");

-- CreateIndex
CREATE INDEX "raw_entries_status_idx" ON "raw_entries"("status");

-- CreateIndex
CREATE INDEX "event_raw_entries_raw_entry_id_idx" ON "event_raw_entries"("raw_entry_id");

-- CreateIndex
CREATE INDEX "event_raw_entries_event_id_idx" ON "event_raw_entries"("event_id");

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_raw_entry_id_fkey" FOREIGN KEY ("raw_entry_id") REFERENCES "raw_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_feedings" ADD CONSTRAINT "event_feedings_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_sleep" ADD CONSTRAINT "event_sleep_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_diapers" ADD CONSTRAINT "event_diapers_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_growth" ADD CONSTRAINT "event_growth_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_weight" ADD CONSTRAINT "event_weight_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_walks" ADD CONSTRAINT "event_walks_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_health" ADD CONSTRAINT "event_health_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_milestones" ADD CONSTRAINT "event_milestones_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_pumping" ADD CONSTRAINT "event_pumping_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_baths" ADD CONSTRAINT "event_baths_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_raw_entries" ADD CONSTRAINT "event_raw_entries_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_raw_entries" ADD CONSTRAINT "event_raw_entries_raw_entry_id_fkey" FOREIGN KEY ("raw_entry_id") REFERENCES "raw_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "csv_imports" ADD CONSTRAINT "csv_imports_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "realm_imports" ADD CONSTRAINT "realm_imports_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timers" ADD CONSTRAINT "timers_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

