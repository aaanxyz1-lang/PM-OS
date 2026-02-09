/*
  # Workflow Automation & Task System

  1. New Tables
    - `tasks` - Actionable work items scoped by workspace
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, FK to workspaces)
      - `title` (text)
      - `description` (text, nullable)
      - `type` (text: LEAD_FOLLOWUP, OPS, CONTENT, GENERAL)
      - `status` (text: TODO, DOING, DONE, BLOCKED)
      - `priority` (text: LOW, MEDIUM, HIGH, URGENT)
      - `due_at` (timestamptz, nullable)
      - `assigned_to_user_id` (uuid, FK to users, nullable)
      - `lead_id` (uuid, FK to leads, nullable)
      - `workflow_run_id` (uuid, nullable - set after workflow_runs exists)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `workflows` - Automation templates
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, FK to workspaces)
      - `name` (text)
      - `description` (text, nullable)
      - `is_active` (boolean, default true)
      - `trigger_type` (text: MANUAL, DAILY, WEEKLY, LEAD_STATUS_CHANGE)
      - `trigger_meta` (jsonb, nullable)
      - `created_at` (timestamptz)

    - `workflow_steps` - Ordered steps within a workflow
      - `id` (uuid, primary key)
      - `workflow_id` (uuid, FK to workflows)
      - `step_order` (integer)
      - `step_type` (text: CREATE_TASK, UPDATE_LEAD, ADD_ACTIVITY)
      - `config` (jsonb)
      - `created_at` (timestamptz)

    - `workflow_runs` - Execution log for workflow runs
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, FK to workspaces)
      - `workflow_id` (uuid, FK to workflows)
      - `run_date` (date)
      - `status` (text: SUCCESS, FAILED)
      - `created_at` (timestamptz)

  2. Security
    - RLS enabled on all 4 new tables
    - Policies allow authenticated users to access data in their workspace
    - Service role has full access via default bypass

  3. Indexes
    - tasks: workspace_id, status, assigned_to_user_id, lead_id, due_at
    - workflows: workspace_id
    - workflow_steps: workflow_id
    - workflow_runs: workspace_id, workflow_id

  4. Seed Data
    - 3 workflows for Acme Corp:
      a) Daily Sales Routine (DAILY)
      b) Daily Content Routine (DAILY)
      c) Overdue Follow-up Rescue (MANUAL)
    - Workflow steps for each
    - 12 sample tasks linked to leads and employees
*/

-- ============================================================
-- TASKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'GENERAL' CHECK (type IN ('LEAD_FOLLOWUP', 'OPS', 'CONTENT', 'GENERAL')),
  status text NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO', 'DOING', 'DONE', 'BLOCKED')),
  priority text NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
  due_at timestamptz,
  assigned_to_user_id uuid REFERENCES users(id),
  lead_id uuid REFERENCES leads(id),
  workflow_run_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view tasks"
  ON tasks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = tasks.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can insert tasks"
  ON tasks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = tasks.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can update tasks"
  ON tasks FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = tasks.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = tasks.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can delete tasks"
  ON tasks FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = tasks.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_lead ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_at);

-- ============================================================
-- WORKFLOWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  trigger_type text NOT NULL DEFAULT 'MANUAL' CHECK (trigger_type IN ('MANUAL', 'DAILY', 'WEEKLY', 'LEAD_STATUS_CHANGE')),
  trigger_meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view workflows"
  ON workflows FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workflows.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can insert workflows"
  ON workflows FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workflows.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can update workflows"
  ON workflows FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workflows.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workflows.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can delete workflows"
  ON workflows FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workflows.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_workflows_workspace_id ON workflows(workspace_id);

-- ============================================================
-- WORKFLOW STEPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  step_order integer NOT NULL DEFAULT 0,
  step_type text NOT NULL CHECK (step_type IN ('CREATE_TASK', 'UPDATE_LEAD', 'ADD_ACTIVITY')),
  config jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workflow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view workflow steps"
  ON workflow_steps FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workflows w
      JOIN workspace_members wm ON wm.workspace_id = w.workspace_id
      WHERE w.id = workflow_steps.workflow_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can insert workflow steps"
  ON workflow_steps FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workflows w
      JOIN workspace_members wm ON wm.workspace_id = w.workspace_id
      WHERE w.id = workflow_steps.workflow_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can update workflow steps"
  ON workflow_steps FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workflows w
      JOIN workspace_members wm ON wm.workspace_id = w.workspace_id
      WHERE w.id = workflow_steps.workflow_id
      AND wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workflows w
      JOIN workspace_members wm ON wm.workspace_id = w.workspace_id
      WHERE w.id = workflow_steps.workflow_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can delete workflow steps"
  ON workflow_steps FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workflows w
      JOIN workspace_members wm ON wm.workspace_id = w.workspace_id
      WHERE w.id = workflow_steps.workflow_id
      AND wm.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow ON workflow_steps(workflow_id);

-- ============================================================
-- WORKFLOW RUNS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  workflow_id uuid NOT NULL REFERENCES workflows(id),
  run_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS', 'FAILED')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Workspace members can view workflow runs"
  ON workflow_runs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workflow_runs.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can insert workflow runs"
  ON workflow_runs FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workflow_runs.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_workflow_runs_workspace ON workflow_runs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_workflow ON workflow_runs(workflow_id);

-- Add FK from tasks to workflow_runs now that both tables exist
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_workflow_run
  FOREIGN KEY (workflow_run_id) REFERENCES workflow_runs(id);

-- ============================================================
-- SEED DATA: WORKFLOWS
-- ============================================================

-- Acme Corp workflows
INSERT INTO workflows (id, workspace_id, name, description, is_active, trigger_type, trigger_meta) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Daily Sales Routine',
   'Creates daily follow-up tasks for all in-progress leads assigned to sales reps',
   true, 'DAILY', '{"run_time": "09:00"}'),
  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'Daily Content Routine',
   'Generates daily content creation and social media tasks for marketing',
   true, 'DAILY', '{"run_time": "08:00"}'),
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'Overdue Follow-up Rescue',
   'Manually triggered workflow to create urgent tasks for overdue lead follow-ups',
   true, 'MANUAL', null)
ON CONFLICT (id) DO NOTHING;

-- TechStart workflow
INSERT INTO workflows (id, workspace_id, name, description, is_active, trigger_type, trigger_meta) VALUES
  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002',
   'Weekly Pipeline Review',
   'Weekly workflow to review pipeline and update lead statuses',
   true, 'WEEKLY', '{"day": "monday", "run_time": "10:00"}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED DATA: WORKFLOW STEPS
-- ============================================================

-- Daily Sales Routine steps
INSERT INTO workflow_steps (id, workflow_id, step_order, step_type, config) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 1, 'CREATE_TASK',
   '{"title_template": "Follow up with {lead_name}", "type": "LEAD_FOLLOWUP", "priority": "HIGH", "due_offset_days": 0, "assign_rule": "lead_owner"}'),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 2, 'ADD_ACTIVITY',
   '{"note_template": "Daily follow-up task created by workflow", "type": "note"}'),
  ('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 3, 'CREATE_TASK',
   '{"title_template": "Review pipeline metrics", "type": "OPS", "priority": "MEDIUM", "due_offset_days": 0, "assign_rule": "lead_owner"}')
ON CONFLICT (id) DO NOTHING;

-- Daily Content Routine steps
INSERT INTO workflow_steps (id, workflow_id, step_order, step_type, config) VALUES
  ('e0000000-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000002', 1, 'CREATE_TASK',
   '{"title_template": "Write blog post draft", "type": "CONTENT", "priority": "MEDIUM", "due_offset_days": 1, "assign_rule": "lead_owner"}'),
  ('e0000000-0000-0000-0000-000000000005', 'd0000000-0000-0000-0000-000000000002', 2, 'CREATE_TASK',
   '{"title_template": "Schedule social media posts", "type": "CONTENT", "priority": "LOW", "due_offset_days": 0, "assign_rule": "lead_owner"}'),
  ('e0000000-0000-0000-0000-000000000006', 'd0000000-0000-0000-0000-000000000002', 3, 'CREATE_TASK',
   '{"title_template": "Review content analytics", "type": "CONTENT", "priority": "LOW", "due_offset_days": 2, "assign_rule": "lead_owner"}')
ON CONFLICT (id) DO NOTHING;

-- Overdue Follow-up Rescue steps
INSERT INTO workflow_steps (id, workflow_id, step_order, step_type, config) VALUES
  ('e0000000-0000-0000-0000-000000000007', 'd0000000-0000-0000-0000-000000000003', 1, 'CREATE_TASK',
   '{"title_template": "URGENT: Re-engage {lead_name}", "type": "LEAD_FOLLOWUP", "priority": "URGENT", "due_offset_days": 0, "assign_rule": "lead_owner"}'),
  ('e0000000-0000-0000-0000-000000000008', 'd0000000-0000-0000-0000-000000000003', 2, 'UPDATE_LEAD',
   '{"new_status": "in_progress"}'),
  ('e0000000-0000-0000-0000-000000000009', 'd0000000-0000-0000-0000-000000000003', 3, 'ADD_ACTIVITY',
   '{"note_template": "Overdue follow-up rescue triggered. Urgent re-engagement required.", "type": "note"}')
ON CONFLICT (id) DO NOTHING;

-- Weekly Pipeline Review steps (TechStart)
INSERT INTO workflow_steps (id, workflow_id, step_order, step_type, config) VALUES
  ('e0000000-0000-0000-0000-00000000000a', 'd0000000-0000-0000-0000-000000000004', 1, 'CREATE_TASK',
   '{"title_template": "Review weekly pipeline status", "type": "OPS", "priority": "HIGH", "due_offset_days": 0, "assign_rule": "lead_owner"}'),
  ('e0000000-0000-0000-0000-00000000000b', 'd0000000-0000-0000-0000-000000000004', 2, 'ADD_ACTIVITY',
   '{"note_template": "Weekly pipeline review initiated", "type": "note"}')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED DATA: WORKFLOW RUNS
-- ============================================================
INSERT INTO workflow_runs (id, workspace_id, workflow_id, run_date, status) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', CURRENT_DATE - 1, 'SUCCESS'),
  ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000003', CURRENT_DATE - 2, 'SUCCESS')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SEED DATA: TASKS
-- ============================================================
INSERT INTO tasks (id, workspace_id, title, description, type, status, priority, due_at, assigned_to_user_id, lead_id, workflow_run_id) VALUES
  -- Acme Corp tasks from Daily Sales Routine run
  ('11000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Follow up with Maria Garcia', 'Daily follow-up for in-progress lead', 'LEAD_FOLLOWUP', 'TODO', 'HIGH',
   now() + interval '2 hours', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001'),

  ('11000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'Follow up with William Brown', 'Follow up scheduled for next week', 'LEAD_FOLLOWUP', 'DOING', 'HIGH',
   now() - interval '1 day', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000005', 'f0000000-0000-0000-0000-000000000001'),

  ('11000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'Review pipeline metrics', 'Daily ops task from sales workflow', 'OPS', 'TODO', 'MEDIUM',
   now() + interval '4 hours', 'b0000000-0000-0000-0000-000000000001', null, 'f0000000-0000-0000-0000-000000000001'),

  -- Overdue Follow-up Rescue tasks
  ('11000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
   'URGENT: Re-engage Linda Wilson', 'Overdue follow-up rescue', 'LEAD_FOLLOWUP', 'TODO', 'URGENT',
   now(), 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000008', 'f0000000-0000-0000-0000-000000000002'),

  ('11000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
   'URGENT: Re-engage Susan Clark', 'Overdue follow-up rescue', 'LEAD_FOLLOWUP', 'DOING', 'URGENT',
   now() - interval '6 hours', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-00000000000e', 'f0000000-0000-0000-0000-000000000002'),

  -- Manual tasks (no workflow)
  ('11000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001',
   'Prepare quarterly report', 'Compile Q1 sales figures and pipeline analysis', 'OPS', 'TODO', 'HIGH',
   now() + interval '3 days', 'b0000000-0000-0000-0000-000000000001', null, null),

  ('11000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001',
   'Write case study for Jennifer Lee', 'Document the successful deal for marketing', 'CONTENT', 'TODO', 'MEDIUM',
   now() + interval '5 days', 'b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000004', null),

  ('11000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001',
   'Call back Thomas Anderson', 'Discuss pricing tiers after expo conversation', 'LEAD_FOLLOWUP', 'DONE', 'HIGH',
   now() - interval '2 days', 'b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-00000000000b', null),

  ('11000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001',
   'Update CRM records', 'Clean up outdated contact information', 'OPS', 'BLOCKED', 'LOW',
   now() + interval '7 days', 'b0000000-0000-0000-0000-000000000003', null, null),

  -- TechStart tasks
  ('11000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000002',
   'Follow up with Betty Hill', 'Second follow-up call needed', 'LEAD_FOLLOWUP', 'TODO', 'HIGH',
   now() + interval '1 day', 'b0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000016', null),

  ('11000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-000000000002',
   'Send proposal to Brian Adams', 'Finalize and send the proposal document', 'LEAD_FOLLOWUP', 'DOING', 'URGENT',
   now(), 'b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000019', null),

  ('11000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-000000000002',
   'Review weekly pipeline status', 'Standard weekly pipeline check', 'OPS', 'TODO', 'MEDIUM',
   now() + interval '2 days', 'b0000000-0000-0000-0000-000000000004', null, null)
ON CONFLICT (id) DO NOTHING;
