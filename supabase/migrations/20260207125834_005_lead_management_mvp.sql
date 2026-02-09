/*
  # Lead Management MVP - Schema updates and demo data

  1. Schema Changes
    - Add `assigned_to` (uuid, nullable) to leads, FK to users
    - Add `source` (text) to leads
    - Make `created_by` nullable on leads (no auth required for MVP)
    - Update leads status constraint: new, in_progress, won, lost
    - Add `type` (text) to activity_logs
    - Make `user_id` nullable on activity_logs

  2. New Indexes
    - idx_leads_assigned_to on leads(assigned_to)
    - idx_leads_status on leads(status)

  3. Demo Data
    - 2 workspaces: Acme Corp, TechStart Inc
    - 5 employees across both workspaces
    - 30 leads with varied statuses, sources, and assignments
    - ~40 activity log entries
*/

-- Add assigned_to column to leads
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE leads ADD COLUMN assigned_to uuid REFERENCES users(id);
  END IF;
END $$;

-- Add source column to leads
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'source'
  ) THEN
    ALTER TABLE leads ADD COLUMN source text DEFAULT '';
  END IF;
END $$;

-- Make created_by nullable (no auth in MVP)
ALTER TABLE leads ALTER COLUMN created_by DROP NOT NULL;

-- Safely migrate existing status values before changing constraint
UPDATE leads SET status = 'in_progress' WHERE status IN ('contacted', 'qualified', 'proposal');
UPDATE leads SET status = 'lost' WHERE status = 'closed';

-- Update status constraint
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check
  CHECK (status IN ('new', 'in_progress', 'won', 'lost'));

-- Add type column to activity_logs
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'activity_logs' AND column_name = 'type'
  ) THEN
    ALTER TABLE activity_logs ADD COLUMN type text DEFAULT 'note';
  END IF;
END $$;

-- Make user_id nullable on activity_logs
ALTER TABLE activity_logs ALTER COLUMN user_id DROP NOT NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);

-- ============================================================
-- DEMO DATA
-- ============================================================

-- Workspaces
INSERT INTO workspaces (id, name, slug) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Acme Corp', 'acme-corp'),
  ('a0000000-0000-0000-0000-000000000002', 'TechStart Inc', 'techstart-inc')
ON CONFLICT (slug) DO NOTHING;

-- Employees (password not used - auth disabled for MVP)
INSERT INTO users (id, email, name, password_hash) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'sarah@acme.com', 'Sarah Johnson', '$2a$10$demo'),
  ('b0000000-0000-0000-0000-000000000002', 'mike@acme.com', 'Mike Chen', '$2a$10$demo'),
  ('b0000000-0000-0000-0000-000000000003', 'lisa@acme.com', 'Lisa Rodriguez', '$2a$10$demo'),
  ('b0000000-0000-0000-0000-000000000004', 'david@techstart.com', 'David Kim', '$2a$10$demo'),
  ('b0000000-0000-0000-0000-000000000005', 'emma@techstart.com', 'Emma Wilson', '$2a$10$demo')
ON CONFLICT (email) DO NOTHING;

-- Workspace memberships
INSERT INTO workspace_members (workspace_id, user_id, role) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'founder'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'admin'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'user'),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000004', 'founder'),
  ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000005', 'admin')
ON CONFLICT (workspace_id, user_id) DO NOTHING;

-- Acme Corp leads (20)
INSERT INTO leads (id, workspace_id, name, phone, email, source, status, assigned_to, notes, value, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'John Smith', '(555) 100-1001', 'john.smith@email.com', 'Website', 'new', 'b0000000-0000-0000-0000-000000000001', 'Interested in enterprise plan', 15000, now() - interval '2 days'),
  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Maria Garcia', '(555) 100-1002', 'maria.garcia@email.com', 'Referral', 'in_progress', 'b0000000-0000-0000-0000-000000000002', 'Referred by existing client', 22000, now() - interval '5 days'),
  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Robert Johnson', '(555) 100-1003', NULL, 'LinkedIn', 'new', 'b0000000-0000-0000-0000-000000000003', 'Connected via LinkedIn campaign', 8000, now() - interval '1 day'),
  ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Jennifer Lee', '(555) 100-1004', 'jennifer.lee@corp.com', 'Trade Show', 'won', 'b0000000-0000-0000-0000-000000000001', 'Met at SaaS Connect 2025', 45000, now() - interval '30 days'),
  ('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'William Brown', '(555) 100-1005', 'will.brown@startup.io', 'Cold Call', 'in_progress', 'b0000000-0000-0000-0000-000000000002', 'Follow up scheduled for next week', 12000, now() - interval '8 days'),
  ('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Patricia Davis', '(555) 100-1006', NULL, 'Website', 'lost', 'b0000000-0000-0000-0000-000000000003', 'Went with competitor', 18000, now() - interval '45 days'),
  ('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Michael Miller', '(555) 100-1007', 'mike.miller@biz.com', 'Referral', 'new', 'b0000000-0000-0000-0000-000000000001', 'Needs demo scheduling', 9500, now() - interval '3 days'),
  ('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'Linda Wilson', '(555) 100-1008', 'linda.w@company.com', 'LinkedIn', 'in_progress', 'b0000000-0000-0000-0000-000000000002', 'Requested pricing details', 31000, now() - interval '12 days'),
  ('c0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'James Moore', '(555) 100-1009', 'jmoore@enterprise.com', 'Website', 'won', 'b0000000-0000-0000-0000-000000000003', 'Signed annual contract', 56000, now() - interval '25 days'),
  ('c0000000-0000-0000-0000-00000000000a', 'a0000000-0000-0000-0000-000000000001', 'Elizabeth Taylor', '(555) 100-1010', NULL, 'Cold Call', 'new', 'b0000000-0000-0000-0000-000000000001', 'Initial interest shown', 7500, now() - interval '1 day'),
  ('c0000000-0000-0000-0000-00000000000b', 'a0000000-0000-0000-0000-000000000001', 'Thomas Anderson', '(555) 100-1011', 'tanderson@tech.co', 'Trade Show', 'in_progress', 'b0000000-0000-0000-0000-000000000002', 'Discussed at booth during expo', 28000, now() - interval '15 days'),
  ('c0000000-0000-0000-0000-00000000000c', 'a0000000-0000-0000-0000-000000000001', 'Barbara Martinez', '(555) 100-1012', NULL, 'Referral', 'lost', 'b0000000-0000-0000-0000-000000000003', 'Budget constraints', 14000, now() - interval '40 days'),
  ('c0000000-0000-0000-0000-00000000000d', 'a0000000-0000-0000-0000-000000000001', 'Christopher Robinson', '(555) 100-1013', 'chris.r@global.com', 'Website', 'new', 'b0000000-0000-0000-0000-000000000001', 'Downloaded whitepaper', 11000, now() - interval '4 days'),
  ('c0000000-0000-0000-0000-00000000000e', 'a0000000-0000-0000-0000-000000000001', 'Susan Clark', '(555) 100-1014', 'sclark@media.net', 'LinkedIn', 'in_progress', 'b0000000-0000-0000-0000-000000000002', 'Evaluating multiple vendors', 19000, now() - interval '10 days'),
  ('c0000000-0000-0000-0000-00000000000f', 'a0000000-0000-0000-0000-000000000001', 'Daniel Lewis', '(555) 100-1015', NULL, 'Cold Call', 'won', 'b0000000-0000-0000-0000-000000000003', 'Closed after 3 meetings', 38000, now() - interval '20 days'),
  ('c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'Margaret Hall', '(555) 100-1016', 'mhall@retail.com', 'Trade Show', 'new', 'b0000000-0000-0000-0000-000000000001', 'Collected card at conference', 6000, now() - interval '6 days'),
  ('c0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'Matthew Allen', '(555) 100-1017', 'matt.allen@fin.com', 'Website', 'in_progress', 'b0000000-0000-0000-0000-000000000002', 'Requested custom demo', 42000, now() - interval '18 days'),
  ('c0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'Dorothy Young', '(555) 100-1018', NULL, 'Referral', 'lost', 'b0000000-0000-0000-0000-000000000003', 'Timing not right', 10000, now() - interval '35 days'),
  ('c0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001', 'Andrew King', '(555) 100-1019', 'aking@services.com', 'LinkedIn', 'new', 'b0000000-0000-0000-0000-000000000001', 'Engaged with content', 16000, now() - interval '3 days'),
  ('c0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'Nancy Wright', '(555) 100-1020', 'nwright@consulting.com', 'Cold Call', 'won', 'b0000000-0000-0000-0000-000000000002', 'Long sales cycle, finally closed', 67000, now() - interval '50 days')
ON CONFLICT (id) DO NOTHING;

-- TechStart Inc leads (10)
INSERT INTO leads (id, workspace_id, name, phone, email, source, status, assigned_to, notes, value, created_at) VALUES
  ('c0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000002', 'Joshua Lopez', '(555) 200-2001', 'jlopez@growth.com', 'Website', 'new', 'b0000000-0000-0000-0000-000000000004', 'Signed up for free trial', 8000, now() - interval '2 days'),
  ('c0000000-0000-0000-0000-000000000016', 'a0000000-0000-0000-0000-000000000002', 'Betty Hill', '(555) 200-2002', NULL, 'Referral', 'in_progress', 'b0000000-0000-0000-0000-000000000005', 'Second follow-up call done', 13000, now() - interval '7 days'),
  ('c0000000-0000-0000-0000-000000000017', 'a0000000-0000-0000-0000-000000000002', 'Kevin Scott', '(555) 200-2003', 'kscott@agency.com', 'LinkedIn', 'won', 'b0000000-0000-0000-0000-000000000004', 'Quick close, loved the product', 25000, now() - interval '22 days'),
  ('c0000000-0000-0000-0000-000000000018', 'a0000000-0000-0000-0000-000000000002', 'Helen Green', '(555) 200-2004', NULL, 'Cold Call', 'new', 'b0000000-0000-0000-0000-000000000005', 'Needs follow-up call', 5500, now() - interval '1 day'),
  ('c0000000-0000-0000-0000-000000000019', 'a0000000-0000-0000-0000-000000000002', 'Brian Adams', '(555) 200-2005', 'badams@digital.com', 'Trade Show', 'in_progress', 'b0000000-0000-0000-0000-000000000004', 'Proposal sent, awaiting review', 34000, now() - interval '14 days'),
  ('c0000000-0000-0000-0000-00000000001a', 'a0000000-0000-0000-0000-000000000002', 'Sandra Baker', '(555) 200-2006', 'sbaker@creative.io', 'Website', 'lost', 'b0000000-0000-0000-0000-000000000005', 'Chose in-house solution', 11000, now() - interval '38 days'),
  ('c0000000-0000-0000-0000-00000000001b', 'a0000000-0000-0000-0000-000000000002', 'George Nelson', '(555) 200-2007', NULL, 'Referral', 'new', 'b0000000-0000-0000-0000-000000000004', 'Warm intro from partner', 9000, now() - interval '4 days'),
  ('c0000000-0000-0000-0000-00000000001c', 'a0000000-0000-0000-0000-000000000002', 'Karen Carter', '(555) 200-2008', 'kcarter@brand.com', 'LinkedIn', 'in_progress', 'b0000000-0000-0000-0000-000000000005', 'Reviewing contract terms', 21000, now() - interval '11 days'),
  ('c0000000-0000-0000-0000-00000000001d', 'a0000000-0000-0000-0000-000000000002', 'Edward Mitchell', '(555) 200-2009', 'emitchell@prod.com', 'Cold Call', 'won', 'b0000000-0000-0000-0000-000000000004', 'Signed 2-year deal', 52000, now() - interval '28 days'),
  ('c0000000-0000-0000-0000-00000000001e', 'a0000000-0000-0000-0000-000000000002', 'Donna Perez', '(555) 200-2010', NULL, 'Trade Show', 'lost', 'b0000000-0000-0000-0000-000000000005', 'Not the right fit', 7000, now() - interval '42 days')
ON CONFLICT (id) DO NOTHING;

-- Activity logs
INSERT INTO activity_logs (workspace_id, lead_id, user_id, action, type, description, created_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Lead Created', 'created', 'Lead was created', now() - interval '2 days'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Lead Created', 'created', 'Lead was created', now() - interval '5 days'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Status Changed', 'status_change', 'Changed from New to In Progress', now() - interval '4 days'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Call Logged', 'call', 'Initial discovery call - 30 min', now() - interval '3 days'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Lead Created', 'created', 'Lead was created', now() - interval '30 days'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Status Changed', 'status_change', 'Changed from New to In Progress', now() - interval '25 days'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Call Logged', 'call', 'Product demo completed', now() - interval '20 days'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Note Added', 'note', 'Client very impressed, sending proposal', now() - interval '18 days'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Status Changed', 'status_change', 'Changed from In Progress to Won', now() - interval '15 days'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 'Lead Created', 'created', 'Lead was created', now() - interval '8 days'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 'Status Changed', 'status_change', 'Changed from New to In Progress', now() - interval '6 days'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000002', 'Note Added', 'note', 'Sent pricing sheet via email', now() - interval '5 days'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000003', 'Lead Created', 'created', 'Lead was created', now() - interval '45 days'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000003', 'Status Changed', 'status_change', 'Changed from New to Lost', now() - interval '30 days'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000003', 'Note Added', 'note', 'Competitor offered lower price', now() - interval '30 days'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000002', 'Lead Created', 'created', 'Lead was created', now() - interval '12 days'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000002', 'Call Logged', 'call', 'Pricing discussion - 45 min call', now() - interval '10 days'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000003', 'Lead Created', 'created', 'Lead was created', now() - interval '25 days'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000009', 'b0000000-0000-0000-0000-000000000003', 'Status Changed', 'status_change', 'Changed from New to Won', now() - interval '15 days'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-000000000002', 'Lead Created', 'created', 'Lead was created', now() - interval '15 days'),
  ('a0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-00000000000b', 'b0000000-0000-0000-0000-000000000002', 'Note Added', 'note', 'Very interested in annual plan', now() - interval '13 days'),
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000015', 'b0000000-0000-0000-0000-000000000004', 'Lead Created', 'created', 'Lead was created', now() - interval '2 days'),
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000005', 'Lead Created', 'created', 'Lead was created', now() - interval '7 days'),
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000016', 'b0000000-0000-0000-0000-000000000005', 'Call Logged', 'call', 'Follow-up call completed', now() - interval '5 days'),
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000004', 'Lead Created', 'created', 'Lead was created', now() - interval '22 days'),
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000017', 'b0000000-0000-0000-0000-000000000004', 'Status Changed', 'status_change', 'Changed from New to Won', now() - interval '18 days'),
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000019', 'b0000000-0000-0000-0000-000000000004', 'Lead Created', 'created', 'Lead was created', now() - interval '14 days'),
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000019', 'b0000000-0000-0000-0000-000000000004', 'Note Added', 'note', 'Proposal reviewed, awaiting sign-off', now() - interval '10 days'),
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-00000000001a', 'b0000000-0000-0000-0000-000000000005', 'Lead Created', 'created', 'Lead was created', now() - interval '38 days'),
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-00000000001a', 'b0000000-0000-0000-0000-000000000005', 'Status Changed', 'status_change', 'Changed from New to Lost', now() - interval '25 days'),
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-00000000001d', 'b0000000-0000-0000-0000-000000000004', 'Lead Created', 'created', 'Lead was created', now() - interval '28 days'),
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-00000000001d', 'b0000000-0000-0000-0000-000000000004', 'Call Logged', 'call', 'Final negotiation call', now() - interval '20 days'),
  ('a0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-00000000001d', 'b0000000-0000-0000-0000-000000000004', 'Status Changed', 'status_change', 'Changed from In Progress to Won', now() - interval '18 days');
