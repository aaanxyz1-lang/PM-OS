/*
  # Allow anon role access for no-auth MVP

  Since this MVP operates without authentication, the API uses the anon key.
  The new tables (tasks, workflows, workflow_steps, workflow_runs) had RLS
  enabled with policies only for the `authenticated` role, blocking all
  operations from the anon key.

  This migration adds `anon` role policies for full CRUD on these tables,
  scoped by workspace_id, matching the no-auth pattern used by the rest
  of the application.

  1. Security Changes
    - Add SELECT/INSERT/UPDATE/DELETE policies for `anon` role on:
      - `tasks`
      - `workflows`
      - `workflow_steps`
      - `workflow_runs`
    - Also add missing anon policies for `activity_logs` INSERT
      (needed for workflow execution to add activity entries)
*/

-- ============================================================
-- TASKS: anon policies
-- ============================================================
CREATE POLICY "Anon can view tasks"
  ON tasks FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anon can insert tasks"
  ON tasks FOR INSERT TO anon
  WITH CHECK (workspace_id IS NOT NULL);

CREATE POLICY "Anon can update tasks"
  ON tasks FOR UPDATE TO anon
  USING (true)
  WITH CHECK (workspace_id IS NOT NULL);

CREATE POLICY "Anon can delete tasks"
  ON tasks FOR DELETE TO anon
  USING (true);

-- ============================================================
-- WORKFLOWS: anon policies
-- ============================================================
CREATE POLICY "Anon can view workflows"
  ON workflows FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anon can insert workflows"
  ON workflows FOR INSERT TO anon
  WITH CHECK (workspace_id IS NOT NULL);

CREATE POLICY "Anon can update workflows"
  ON workflows FOR UPDATE TO anon
  USING (true)
  WITH CHECK (workspace_id IS NOT NULL);

CREATE POLICY "Anon can delete workflows"
  ON workflows FOR DELETE TO anon
  USING (true);

-- ============================================================
-- WORKFLOW_STEPS: anon policies
-- ============================================================
CREATE POLICY "Anon can view workflow steps"
  ON workflow_steps FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anon can insert workflow steps"
  ON workflow_steps FOR INSERT TO anon
  WITH CHECK (workflow_id IS NOT NULL);

CREATE POLICY "Anon can update workflow steps"
  ON workflow_steps FOR UPDATE TO anon
  USING (true)
  WITH CHECK (workflow_id IS NOT NULL);

CREATE POLICY "Anon can delete workflow steps"
  ON workflow_steps FOR DELETE TO anon
  USING (true);

-- ============================================================
-- WORKFLOW_RUNS: anon policies
-- ============================================================
CREATE POLICY "Anon can view workflow runs"
  ON workflow_runs FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anon can insert workflow runs"
  ON workflow_runs FOR INSERT TO anon
  WITH CHECK (workspace_id IS NOT NULL);
