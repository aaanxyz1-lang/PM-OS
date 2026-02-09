/*
  # Add Normalized Phone and Duplicate Tracking

  1. New Columns
    - `leads.normalized_phone` (text, nullable) - Phone normalized for duplicate matching (trim, remove spaces, format standardized)
    - `leads.business_name` (text, nullable) - Optional business name for the lead
  
  2. Indexes
    - Index on `(workspace_id, normalized_phone)` for fast duplicate lookup
  
  3. Changes
    - normalizedPhone for consistent phone matching across formats:
      - Trim spaces
      - Remove non-digits except leading +
      - Support BD formats: +8801XXXXXXXXX and 01XXXXXXXXX
    - business_name as optional field for additional context
  
  4. Important Notes
    - Lookup queries use the normalized_phone field for matching
    - Duplicates are workspace-scoped
    - Old leads without normalized_phone will be matched by exact phone
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'normalized_phone'
  ) THEN
    ALTER TABLE leads ADD COLUMN normalized_phone text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'business_name'
  ) THEN
    ALTER TABLE leads ADD COLUMN business_name text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_workspace_normalized_phone
  ON leads(workspace_id, normalized_phone);

CREATE INDEX IF NOT EXISTS idx_leads_normalized_phone
  ON leads(normalized_phone);
