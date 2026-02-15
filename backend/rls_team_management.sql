-- =============================================
-- RLS Policies: Allow MANAGER to manage team members
-- Only managers can UPDATE/DELETE profiles in their own org
-- =============================================

-- Enable RLS on profiles if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY IF NOT EXISTS "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow managers to read all profiles in their org
CREATE POLICY IF NOT EXISTS "Managers can read org profiles"
  ON profiles FOR SELECT
  USING (
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Allow managers to UPDATE profiles in their org (role, organization_id)
CREATE POLICY IF NOT EXISTS "Managers can update org profiles"
  ON profiles FOR UPDATE
  USING (
    -- Target must be in same org
    organization_id = (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
    AND
    -- Requester must be MANAGER or ADMIN
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('MANAGER', 'ADMIN')
    )
    AND
    -- Cannot update yourself
    id != auth.uid()
  );

-- Note: We use soft-remove (set organization_id to NULL) instead of DELETE.
-- If you want hard DELETE, uncomment below:
--
-- CREATE POLICY IF NOT EXISTS "Managers can delete org profiles"
--   ON profiles FOR DELETE
--   USING (
--     organization_id = (
--       SELECT organization_id FROM profiles WHERE id = auth.uid()
--     )
--     AND EXISTS (
--       SELECT 1 FROM profiles
--       WHERE id = auth.uid()
--         AND role IN ('MANAGER', 'ADMIN')
--     )
--     AND id != auth.uid()
--   );
