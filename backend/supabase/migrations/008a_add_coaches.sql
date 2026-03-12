-- 008: Add coaches table with embedded scripts

-- 1. Coaches table
CREATE TABLE coaches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    -- AI Persona
    persona TEXT,
    methodology TEXT,
    tone TEXT NOT NULL DEFAULT 'CONSULTIVE' CHECK (tone IN ('AGGRESSIVE', 'CONSULTIVE', 'EMPATHETIC')),
    intervention_level TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (intervention_level IN ('HIGH', 'MEDIUM', 'LOW')),
    -- Product context
    product_name TEXT,
    product_description TEXT,
    product_differentials TEXT,
    product_pricing_info TEXT,
    product_target_audience TEXT,
    -- Embedded script
    script_name TEXT,
    script_steps JSONB DEFAULT '[]'::jsonb,
    script_objections JSONB DEFAULT '[]'::jsonb,
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_coaches_org ON coaches(organization_id);

-- 2. Add coach_id to calls (nullable for backward compatibility)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calls' AND column_name = 'coach_id') THEN
        ALTER TABLE public.calls ADD COLUMN coach_id UUID REFERENCES coaches(id) ON DELETE SET NULL;
        CREATE INDEX idx_calls_coach ON calls(coach_id);
    END IF;
END $$;

-- 3. RLS
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view org coaches" ON coaches
    FOR SELECT USING (organization_id = get_auth_user_org_id());

CREATE POLICY "Managers insert coaches" ON coaches
    FOR INSERT WITH CHECK (
        organization_id = get_auth_user_org_id()
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
    );

CREATE POLICY "Managers update coaches" ON coaches
    FOR UPDATE USING (
        organization_id = get_auth_user_org_id()
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
    );

CREATE POLICY "Managers delete coaches" ON coaches
    FOR DELETE USING (
        organization_id = get_auth_user_org_id()
        AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))
    );

-- 4. Updated_at trigger
CREATE TRIGGER update_coaches_modtime BEFORE UPDATE ON coaches FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
