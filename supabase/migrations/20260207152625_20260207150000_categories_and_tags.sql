/*
  # Create Categories and Tags System

  1. New Tables
    - `categories`: Customizable category system for leads, tasks, workflows
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, foreign key to workspaces)
      - `type` (text: LEAD_SOURCE, LEAD_STATUS, TASK_STATUS, FEEDBACK_TYPE, TAG)
      - `name` (text)
      - `color` (text, hex color code)
      - `is_active` (boolean, default true)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `tags`: Standalone tags for cross-module use
      - `id` (uuid, primary key)
      - `workspace_id` (uuid, foreign key to workspaces)
      - `name` (text)
      - `color` (text, hex color code)
      - `created_at` (timestamp)

    - `lead_tags`: Junction table for lead-tag relationships
      - `id` (uuid, primary key)
      - `lead_id` (uuid, foreign key to leads)
      - `tag_id` (uuid, foreign key to tags)
      - `created_at` (timestamp)

    - `task_tags`: Junction table for task-tag relationships
      - `id` (uuid, primary key)
      - `task_id` (uuid, foreign key to tasks)
      - `tag_id` (uuid, foreign key to tags)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Categories/tags only visible to workspace members
    - Only workspace members can create/edit/delete

  3. Indexes
    - workspace_id for quick filtering
    - unique constraint on (workspace_id, type, name) for categories
*/

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('LEAD_SOURCE', 'LEAD_STATUS', 'TASK_STATUS', 'FEEDBACK_TYPE', 'TAG')),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#64748b',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, type, name)
);

CREATE TABLE IF NOT EXISTS tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#64748b',
  created_at timestamptz DEFAULT now(),
  UNIQUE(workspace_id, name)
);

CREATE TABLE IF NOT EXISTS lead_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(lead_id, tag_id)
);

CREATE TABLE IF NOT EXISTS task_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(task_id, tag_id)
);

CREATE INDEX idx_categories_workspace ON categories(workspace_id);
CREATE INDEX idx_categories_type ON categories(type);
CREATE INDEX idx_tags_workspace ON tags(workspace_id);
CREATE INDEX idx_lead_tags_lead ON lead_tags(lead_id);
CREATE INDEX idx_lead_tags_tag ON lead_tags(tag_id);
CREATE INDEX idx_task_tags_task ON task_tags(task_id);
CREATE INDEX idx_task_tags_tag ON task_tags(tag_id);

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories viewable by workspace members"
  ON categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = categories.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Categories manageable by workspace members"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Categories updatable by workspace members"
  ON categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = categories.workspace_id
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

CREATE POLICY "Categories deletable by workspace members"
  ON categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = categories.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Tags viewable by workspace members"
  ON tags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = tags.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Tags manageable by workspace members"
  ON tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Tags updatable by workspace members"
  ON tags FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = tags.workspace_id
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

CREATE POLICY "Tags deletable by workspace members"
  ON tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = tags.workspace_id
      AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Lead tags viewable by workspace members"
  ON lead_tags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_tags.lead_id
      AND EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = leads.workspace_id
        AND workspace_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Lead tags manageable by workspace members"
  ON lead_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_id
      AND EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = leads.workspace_id
        AND workspace_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Lead tags deletable by workspace members"
  ON lead_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_tags.lead_id
      AND EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = leads.workspace_id
        AND workspace_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Task tags viewable by workspace members"
  ON task_tags FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_tags.task_id
      AND EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = tasks.workspace_id
        AND workspace_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Task tags manageable by workspace members"
  ON task_tags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_id
      AND EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = tasks.workspace_id
        AND workspace_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Task tags deletable by workspace members"
  ON task_tags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_tags.task_id
      AND EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = tasks.workspace_id
        AND workspace_members.user_id = auth.uid()
      )
    )
  );
