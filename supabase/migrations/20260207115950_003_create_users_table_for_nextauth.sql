/*
  # Create users table for NextAuth credentials auth

  1. New Tables
    - `users` (application-level user table for NextAuth)
      - `id` (uuid, primary key)
      - `email` (text, unique, not null)
      - `name` (text)
      - `password_hash` (text, not null)
      - `created_at` (timestamptz)

  2. Changes
    - Remove foreign key constraints from workspace_members, leads,
      activity_logs that reference auth.users
    - Add new foreign key constraints referencing the new users table
    - Disable RLS on all tables (auth handled via NextAuth + API routes)

  3. Notes
    - This migration switches from Supabase Auth to NextAuth credentials
    - All data access will go through authenticated API routes
*/

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text DEFAULT '',
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workspace_members DROP CONSTRAINT IF EXISTS workspace_members_user_id_fkey;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_created_by_fkey;
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;

ALTER TABLE workspace_members
  ADD CONSTRAINT workspace_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE leads
  ADD CONSTRAINT leads_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id);

ALTER TABLE activity_logs
  ADD CONSTRAINT activity_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;
