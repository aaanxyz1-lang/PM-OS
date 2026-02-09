/*
  # Scheduling and Follow-up Automation Engine Schema
  
  1. New Tables
    - `message_templates`: Reusable message templates for automation
    - `automation_jobs`: Queue of scheduled automation jobs
    - `automation_attachments`: Track which workflows are attached to leads
  
  2. Schema Changes
    - Add `next_touch_at` to leads table
    - Add workflow step types: SCHEDULE_MESSAGE, SET_NEXT_TOUCH
  
  3. Security
    - Enable RLS on all new tables
    - Workspace-scoped access policies
*/

CREATE TABLE IF NOT EXISTS message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  name text NOT NULL,
  channel text NOT NULL CHECK (channel = ANY (ARRAY['WHATSAPP'::text, 'MESSENGER'::text, 'SMS'::text, 'OTHER'::text])),
  content text NOT NULL,
  variables jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS automation_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  entity_type text NOT NULL CHECK (entity_type = 'LEAD'::text),
  entity_id uuid NOT NULL,
  workflow_id uuid REFERENCES workflows(id),
  workflow_step_id uuid,
  job_type text NOT NULL CHECK (job_type = ANY (ARRAY['SCHEDULE_MESSAGE'::text, 'CREATE_FOLLOWUP_TASK'::text, 'SET_NEXT_TOUCH'::text])),
  scheduled_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status = ANY (ARRAY['PENDING'::text, 'RUNNING'::text, 'DONE'::text, 'FAILED'::text, 'SKIPPED'::text])),
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  FOREIGN KEY (entity_id) REFERENCES leads(id)
);

CREATE TABLE IF NOT EXISTS automation_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  lead_id uuid NOT NULL REFERENCES leads(id),
  workflow_id uuid NOT NULL REFERENCES workflows(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(lead_id, workflow_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'next_touch_at'
  ) THEN
    ALTER TABLE leads ADD COLUMN next_touch_at timestamptz DEFAULT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_automation_jobs_scheduled_status 
  ON automation_jobs(scheduled_at, status) WHERE status = 'PENDING'::text;
CREATE INDEX IF NOT EXISTS idx_automation_jobs_lead 
  ON automation_jobs(entity_id) WHERE status = 'PENDING'::text;
CREATE INDEX IF NOT EXISTS idx_leads_next_touch 
  ON leads(next_touch_at) WHERE next_touch_at IS NOT NULL;

ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read templates in their workspace"
  ON message_templates FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create templates in their workspace"
  ON message_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update templates in their workspace"
  ON message_templates FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete templates in their workspace"
  ON message_templates FOR DELETE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read automation jobs in their workspace"
  ON automation_jobs FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create automation jobs in their workspace"
  ON automation_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update automation jobs in their workspace"
  ON automation_jobs FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read automation attachments in their workspace"
  ON automation_attachments FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create automation attachments in their workspace"
  ON automation_attachments FOR INSERT
  TO authenticated
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update automation attachments in their workspace"
  ON automation_attachments FOR UPDATE
  TO authenticated
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid()
    )
  );
