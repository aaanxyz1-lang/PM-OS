/*
  # Add Calendar Fields to Tasks

  1. New Columns
    - `start_at` (timestamptz, nullable) - When task starts (for time blocking)
    - `end_at` (timestamptz, nullable) - When task ends (for time blocking)
    - `is_all_day` (boolean, default false) - Whether task is all-day event

  2. Notes
    - `due_at` remains nullable for backwards compatibility
    - Calendar will filter out tasks without due_at
    - All changes are non-destructive (ADD COLUMN only)
*/

-- Add calendar fields to tasks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'start_at'
  ) THEN
    ALTER TABLE tasks ADD COLUMN start_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'end_at'
  ) THEN
    ALTER TABLE tasks ADD COLUMN end_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'is_all_day'
  ) THEN
    ALTER TABLE tasks ADD COLUMN is_all_day boolean DEFAULT false;
  END IF;
END $$;
