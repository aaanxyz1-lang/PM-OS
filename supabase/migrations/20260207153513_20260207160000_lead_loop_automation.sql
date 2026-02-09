/*
  # Lead Loop Automation Engine

  1. New Tables
    - `lead_loop_templates`: Configurable follow-up loop workflows
    - `lead_loop_steps`: Individual steps in a loop template
    - `lead_active_loops`: Links leads to active loops
    - `lead_loop_executions`: Execution history of loop steps

  2. Enhanced Lead table with loop tracking fields

  3. Security
    - Enable RLS on all new tables
    - Workspace-scoped access

  4. Key Features
    - Time-based automation (immediate, hours, days, monthly)
    - Qualification tracking
    - Duplicate detection by phone
    - Loop pause/resume capability
*/

-- Create LeadLoopTemplate table
CREATE TABLE IF NOT EXISTS lead_loop_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, name)
);

-- Create LeadLoopStep table
CREATE TABLE IF NOT EXISTS lead_loop_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loop_template_id uuid NOT NULL REFERENCES lead_loop_templates(id) ON DELETE CASCADE,
  step_order integer NOT NULL,
  delay_type text NOT NULL CHECK (delay_type IN ('IMMEDIATE', 'HOURS', 'DAYS', 'MONTHLY')),
  delay_value integer NOT NULL DEFAULT 0,
  action_type text NOT NULL CHECK (action_type IN ('CREATE_TASK', 'SEND_MESSAGE')),
  task_title_template text NOT NULL,
  task_type text NOT NULL DEFAULT 'LEAD_FOLLOWUP',
  assign_rule text NOT NULL DEFAULT 'sameAgent' CHECK (assign_rule IN ('sameAgent', 'roundRobin', 'manual')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(loop_template_id, step_order)
);

-- Create LeadActiveLoop table
CREATE TABLE IF NOT EXISTS lead_active_loops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  loop_template_id uuid NOT NULL REFERENCES lead_loop_templates(id),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  loop_step_index integer NOT NULL DEFAULT 0,
  is_paused boolean NOT NULL DEFAULT false,
  next_execution_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(lead_id) -- only one active loop per lead
);

-- Create LeadLoopExecution table for history
CREATE TABLE IF NOT EXISTS lead_loop_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  loop_step_id uuid NOT NULL REFERENCES lead_loop_steps(id),
  task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  executed_at timestamptz DEFAULT now(),
  status text NOT NULL CHECK (status IN ('SUCCESS', 'FAILED')),
  error_message text
);

-- Enhance leads table with qualification and loop fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'qualified_status'
  ) THEN
    ALTER TABLE leads ADD COLUMN qualified_status text DEFAULT 'PENDING' CHECK (qualified_status IN ('YES', 'NO', 'PENDING'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'feedback_type_id'
  ) THEN
    ALTER TABLE leads ADD COLUMN feedback_type_id uuid REFERENCES categories(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'last_interaction_at'
  ) THEN
    ALTER TABLE leads ADD COLUMN last_interaction_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create indexes
CREATE INDEX idx_lead_loop_templates_workspace ON lead_loop_templates(workspace_id);
CREATE INDEX idx_lead_loop_steps_template ON lead_loop_steps(loop_template_id);
CREATE INDEX idx_lead_active_loops_lead ON lead_active_loops(lead_id);
CREATE INDEX idx_lead_active_loops_workspace ON lead_active_loops(workspace_id);
CREATE INDEX idx_lead_active_loops_next_execution ON lead_active_loops(next_execution_at);
CREATE INDEX idx_lead_loop_executions_lead ON lead_loop_executions(lead_id);
CREATE INDEX idx_leads_phone_workspace ON leads(workspace_id, phone);

-- Enable RLS
ALTER TABLE lead_loop_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_loop_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_active_loops ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_loop_executions ENABLE ROW LEVEL SECURITY;

-- Lead Loop Template policies
CREATE POLICY "LeadLoopTemplates viewable by workspace members"
  ON lead_loop_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = lead_loop_templates.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "LeadLoopTemplates manageable by workspace members"
  ON lead_loop_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "LeadLoopTemplates updatable by workspace members"
  ON lead_loop_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = lead_loop_templates.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "LeadLoopTemplates deletable by workspace members"
  ON lead_loop_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = lead_loop_templates.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- Lead Loop Steps policies (inherit from template)
CREATE POLICY "LeadLoopSteps viewable by workspace members"
  ON lead_loop_steps FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lead_loop_templates llt
      WHERE llt.id = lead_loop_steps.loop_template_id
      AND EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = llt.workspace_id
        AND workspace_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "LeadLoopSteps manageable by workspace members"
  ON lead_loop_steps FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM lead_loop_templates llt
      WHERE llt.id = loop_template_id
      AND EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = llt.workspace_id
        AND workspace_members.user_id = auth.uid()
      )
    )
  );

-- Active Loops policies
CREATE POLICY "LeadActiveLoops viewable by workspace members"
  ON lead_active_loops FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = lead_active_loops.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "LeadActiveLoops manageable by workspace members"
  ON lead_active_loops FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "LeadActiveLoops updatable by workspace members"
  ON lead_active_loops FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = lead_active_loops.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

-- Loop Executions policies
CREATE POLICY "LeadLoopExecutions viewable by workspace members"
  ON lead_loop_executions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = lead_loop_executions.lead_id
      AND EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = l.workspace_id
        AND workspace_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "LeadLoopExecutions creatable by workspace members"
  ON lead_loop_executions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = lead_id
      AND EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = l.workspace_id
        AND workspace_members.user_id = auth.uid()
      )
    )
  );
