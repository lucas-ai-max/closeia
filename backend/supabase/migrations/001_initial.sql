-- Enable requried extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'FREE' CHECK (plan IN ('FREE', 'STARTER', 'PRO', 'ENTERPRISE')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    settings JSONB DEFAULT '{}'::jsonb, -- { language: 'pt-BR', timezone: 'America/Sao_Paulo' }
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Profiles (Sync with auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'SELLER' CHECK (role IN ('ADMIN', 'MANAGER', 'SELLER')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Scripts
CREATE TABLE scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    coach_personality TEXT NOT NULL,
    coach_tone TEXT NOT NULL DEFAULT 'CONSULTIVE' CHECK (coach_tone IN ('AGGRESSIVE', 'CONSULTIVE', 'EMPATHETIC')),
    intervention_level TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (intervention_level IN ('HIGH', 'MEDIUM', 'LOW')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Script Steps
CREATE TABLE script_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    script_id UUID REFERENCES scripts(id) ON DELETE CASCADE NOT NULL,
    step_order INT NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    key_questions JSONB DEFAULT '[]'::jsonb,
    transition_criteria TEXT,
    estimated_duration INT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(script_id, step_order)
);

-- 5. Objections
CREATE TABLE objections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    script_id UUID REFERENCES scripts(id) ON DELETE CASCADE NOT NULL,
    step_id UUID REFERENCES script_steps(id) ON DELETE SET NULL,
    trigger_phrases JSONB NOT NULL DEFAULT '[]'::jsonb,
    suggested_response TEXT NOT NULL,
    mental_trigger TEXT NOT NULL CHECK (mental_trigger IN ('SCARCITY', 'URGENCY', 'SOCIAL_PROOF', 'AUTHORITY', 'RECIPROCITY', 'COMMITMENT', 'EMOTION', 'LOGIC')),
    coaching_tip TEXT NOT NULL,
    priority INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Calls
CREATE TABLE calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) NOT NULL,
    script_id UUID REFERENCES scripts(id) NOT NULL,
    organization_id UUID REFERENCES organizations(id) NOT NULL,
    platform TEXT DEFAULT 'OTHER' CHECK (platform IN ('GOOGLE_MEET', 'ZOOM_WEB', 'OTHER')),
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'ABANDONED')),
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ,
    duration_seconds INT,
    transcript JSONB DEFAULT '[]'::jsonb,
    lead_profile JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. Call Events
CREATE TABLE call_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID REFERENCES calls(id) ON DELETE CASCADE NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT now(),
    event_type TEXT NOT NULL CHECK (event_type IN ('COACHING', 'OBJECTION_DETECTED', 'BUYING_SIGNAL', 'STAGE_CHANGE', 'ALERT', 'REINFORCEMENT')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Call Summaries
CREATE TABLE call_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID REFERENCES calls(id) ON DELETE CASCADE UNIQUE NOT NULL,
    script_adherence_score FLOAT,
    strengths JSONB DEFAULT '[]'::jsonb,
    improvements JSONB DEFAULT '[]'::jsonb,
    objections_faced JSONB DEFAULT '[]'::jsonb,
    buying_signals JSONB DEFAULT '[]'::jsonb,
    lead_sentiment TEXT CHECK (lead_sentiment IN ('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED')),
    result TEXT CHECK (result IN ('CONVERTED', 'FOLLOW_UP', 'LOST', 'UNKNOWN')),
    ai_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_profiles_org ON profiles(organization_id);
CREATE INDEX idx_scripts_org ON scripts(organization_id);
CREATE INDEX idx_script_steps_script ON script_steps(script_id);
CREATE INDEX idx_objections_script ON objections(script_id);
CREATE INDEX idx_calls_user ON calls(user_id);
CREATE INDEX idx_calls_org ON calls(organization_id);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_call_events_call ON call_events(call_id);

-- RLS Policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE objections ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_summaries ENABLE ROW LEVEL SECURITY;

-- Note: Using auth.uid() directly or joining with profiles for org check

-- Helper function to get current user org
CREATE OR REPLACE FUNCTION get_auth_user_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Organizations
CREATE POLICY "Users view own org" ON organizations
    FOR SELECT USING (id = get_auth_user_org_id());

-- Profiles
CREATE POLICY "Users view org members" ON profiles
    FOR SELECT USING (organization_id = get_auth_user_org_id());
CREATE POLICY "Admins edit org members" ON profiles
    FOR ALL USING (organization_id = get_auth_user_org_id() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- Scripts
CREATE POLICY "Users view org scripts" ON scripts
    FOR SELECT USING (organization_id = get_auth_user_org_id());
CREATE POLICY "Managers edit scripts" ON scripts
    FOR ALL USING (organization_id = get_auth_user_org_id() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER')));

-- Script Steps
CREATE POLICY "Users view steps" ON script_steps
    FOR SELECT USING (EXISTS (SELECT 1 FROM scripts WHERE id = script_steps.script_id AND organization_id = get_auth_user_org_id()));
CREATE POLICY "Managers edit steps" ON script_steps
    FOR ALL USING (EXISTS (SELECT 1 FROM scripts WHERE id = script_steps.script_id AND organization_id = get_auth_user_org_id() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))));

-- Objections
CREATE POLICY "Users view objections" ON objections
    FOR SELECT USING (EXISTS (SELECT 1 FROM scripts WHERE id = objections.script_id AND organization_id = get_auth_user_org_id()));
CREATE POLICY "Managers edit objections" ON objections
    FOR ALL USING (EXISTS (SELECT 1 FROM scripts WHERE id = objections.script_id AND organization_id = get_auth_user_org_id() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))));

-- Calls
CREATE POLICY "Sellers view own calls" ON calls
    FOR SELECT USING (user_id = auth.uid() OR (organization_id = get_auth_user_org_id() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))));
CREATE POLICY "Users create calls" ON calls
    FOR INSERT WITH CHECK (user_id = auth.uid() AND organization_id = get_auth_user_org_id());
CREATE POLICY "Users update own calls" ON calls
    FOR UPDATE USING (user_id = auth.uid() OR (organization_id = get_auth_user_org_id() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))));

-- Call Events & Summaries (inherit access)
CREATE POLICY "View events with access to call" ON call_events
    FOR SELECT USING (EXISTS (SELECT 1 FROM calls WHERE id = call_events.call_id AND (user_id = auth.uid() OR (organization_id = get_auth_user_org_id() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))))));
CREATE POLICY "View summaries with access to call" ON call_summaries
    FOR SELECT USING (EXISTS (SELECT 1 FROM calls WHERE id = call_summaries.call_id AND (user_id = auth.uid() OR (organization_id = get_auth_user_org_id() AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('ADMIN', 'MANAGER'))))));

-- Triggers

-- 1. Update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_modtime BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_scripts_modtime BEFORE UPDATE ON scripts FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_script_steps_modtime BEFORE UPDATE ON script_steps FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_objections_modtime BEFORE UPDATE ON objections FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_calls_modtime BEFORE UPDATE ON calls FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 2. Auth.users sync
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
BEGIN
  -- Create default organization for new user (Simplification: User creates Org on signup, or handles via invite logic)
  -- For now, we assume user is created via invite or signup which creates org first separately
  -- But to make it work standalone: trigger creates a new org for every new user signed up directly
  INSERT INTO public.organizations (name, plan)
  VALUES (COALESCE(new.raw_user_meta_data->>'company_name', 'My Organization'), 'FREE')
  RETURNING id INTO org_id;

  INSERT INTO public.profiles (id, organization_id, name, role)
  VALUES (new.id, org_id, COALESCE(new.raw_user_meta_data->>'full_name', 'New User'), 'ADMIN');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Calculate Call Duration
CREATE OR REPLACE FUNCTION calculate_call_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'COMPLETED' AND OLD.status != 'COMPLETED' THEN
        NEW.ended_at = now();
        NEW.duration_seconds = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_call_duration
  BEFORE UPDATE ON calls
  FOR EACH ROW EXECUTE PROCEDURE calculate_call_duration();
