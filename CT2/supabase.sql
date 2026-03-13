-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1) User profile table (one profile per authenticated user)
CREATE TABLE IF NOT EXISTS "user_profiles" (
  id uuid PRIMARY KEY DEFAULT auth.uid(), -- defaults to the authenticated user's id
  full_name text,
  birth_date date,
  timezone text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2) Cycles (period entries)
CREATE TABLE IF NOT EXISTS "cycles" (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES "user_profiles"(id) ON DELETE CASCADE,
  start_date date NOT NULL,
  end_date date, -- nullable if the user only provides start and updates later
  flow_level smallint, -- optional flow indicator (e.g., 0=light,1=medium,2=heavy)
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT cycles_valid_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Indexes to support RLS performance
CREATE INDEX IF NOT EXISTS idx_cycles_user_id ON "cycles"(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON "user_profiles"(id);

-- -------------------------
-- Row Level Security (RLS)
-- -------------------------

-- user_profiles RLS and policies
ALTER TABLE "user_profiles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profiles_select_own" ON "user_profiles"
  FOR SELECT
  TO authenticated
  USING ( (SELECT auth.uid()) = id );

CREATE POLICY "user_profiles_insert_own" ON "user_profiles"
  FOR INSERT
  TO authenticated
  WITH CHECK ( (SELECT auth.uid()) = id );

CREATE POLICY "user_profiles_update_own" ON "user_profiles"
  FOR UPDATE
  TO authenticated
  USING ( (SELECT auth.uid()) = id )
  WITH CHECK ( (SELECT auth.uid()) = id );

CREATE POLICY "user_profiles_delete_own" ON "user_profiles"
  FOR DELETE
  TO authenticated
  USING ( (SELECT auth.uid()) = id );

-- cycles RLS and policies
ALTER TABLE "cycles" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cycles_select_own" ON "cycles"
  FOR SELECT
  TO authenticated
  USING ( user_id = (SELECT auth.uid()) );

CREATE POLICY "cycles_insert_own" ON "cycles"
  FOR INSERT
  TO authenticated
  WITH CHECK ( user_id = (SELECT auth.uid()) );

CREATE POLICY "cycles_update_own" ON "cycles"
  FOR UPDATE
  TO authenticated
  USING ( user_id = (SELECT auth.uid()) )
  WITH CHECK ( user_id = (SELECT auth.uid()) );

CREATE POLICY "cycles_delete_own" ON "cycles"
  FOR DELETE
  TO authenticated
  USING ( user_id = (SELECT auth.uid()) );

-- NOTE: service_role bypasses RLS and should be used only on server-side jobs
