/*
  # Create atomic signup function

  1. New Function
    - `signup_create_tenant` - Performs user, workspace, and membership
      creation inside a single atomic transaction.
      - Checks for globally duplicate email
      - Checks for duplicate workspace slug, appends suffix if needed
      - Returns the created user id, workspace id, and role

  2. Notes
    - All three inserts succeed or none do
    - Prevents orphaned users / workspaces on partial failure
*/

CREATE OR REPLACE FUNCTION signup_create_tenant(
  p_email text,
  p_name text,
  p_password_hash text,
  p_workspace_name text,
  p_workspace_slug text
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_id uuid;
  v_workspace_id uuid;
  v_final_slug text;
  v_slug_suffix int := 0;
BEGIN
  -- Check global email uniqueness
  IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
    RETURN jsonb_build_object('error', 'An account with this email already exists');
  END IF;

  -- Create user
  INSERT INTO users (email, name, password_hash)
  VALUES (p_email, p_name, p_password_hash)
  RETURNING id INTO v_user_id;

  -- Resolve unique slug
  v_final_slug := p_workspace_slug;
  WHILE EXISTS (SELECT 1 FROM workspaces WHERE slug = v_final_slug) LOOP
    v_slug_suffix := v_slug_suffix + 1;
    v_final_slug := p_workspace_slug || '-' || v_slug_suffix;
  END LOOP;

  -- Create workspace
  INSERT INTO workspaces (name, slug)
  VALUES (p_workspace_name, v_final_slug)
  RETURNING id INTO v_workspace_id;

  -- Create founder membership
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, v_user_id, 'founder');

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'workspace_id', v_workspace_id,
    'slug', v_final_slug
  );
END;
$$;
