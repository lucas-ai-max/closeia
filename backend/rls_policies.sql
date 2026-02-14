-- Enable RLS on tables
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objections ENABLE ROW LEVEL SECURITY;

-- CALLS POLICIES
DROP POLICY IF EXISTS "Managers view all org calls" ON public.calls;
CREATE POLICY "Managers view all org calls" ON public.calls
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'MANAGER'
      AND organization_id = calls.organization_id
    )
  );

DROP POLICY IF EXISTS "Sellers view own calls" ON public.calls;
CREATE POLICY "Sellers view own calls" ON public.calls
  FOR SELECT
  USING (user_id = auth.uid());

-- CALL_SUMMARIES POLICIES
DROP POLICY IF EXISTS "Managers view all org summaries" ON public.call_summaries;
CREATE POLICY "Managers view all org summaries" ON public.call_summaries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'MANAGER'
      AND organization_id = (SELECT organization_id FROM calls WHERE id = call_summaries.call_id)
    )
  );

DROP POLICY IF EXISTS "Sellers view own summaries" ON public.call_summaries;
CREATE POLICY "Sellers view own summaries" ON public.call_summaries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calls
      WHERE id = call_summaries.call_id
      AND user_id = auth.uid()
    )
  );

-- OBJECTIONS POLICIES (Assuming similar structure or org-based)
-- If objections are global/org-wide:
DROP POLICY IF EXISTS "Managers view all org objections" ON public.objections;
CREATE POLICY "Managers view all org objections" ON public.objections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'MANAGER'
      AND organization_id = objections.organization_id
    )
  );

DROP POLICY IF EXISTS "Sellers view all org objections" ON public.objections;
CREATE POLICY "Sellers view all org objections" ON public.objections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND organization_id = objections.organization_id
    )
  );
