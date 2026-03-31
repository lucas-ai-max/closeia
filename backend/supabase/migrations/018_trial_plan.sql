-- Add TRIAL plan: new users get 1 hour free, no credit card needed
-- Update the handle_new_user trigger to create orgs with TRIAL instead of FREE

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  ref_code TEXT;
  aff_id UUID;
BEGIN
  -- Create default organization with TRIAL plan (1h free)
  INSERT INTO public.organizations (name, plan)
  VALUES (COALESCE(new.raw_user_meta_data->>'company_name', 'My Organization'), 'TRIAL')
  RETURNING id INTO org_id;

  INSERT INTO public.profiles (id, organization_id, name, role)
  VALUES (new.id, org_id, COALESCE(new.raw_user_meta_data->>'full_name', 'New User'), 'MANAGER');

  -- Handle affiliate referral code if present
  ref_code := new.raw_user_meta_data->>'referral_code';
  IF ref_code IS NOT NULL AND ref_code != '' THEN
    SELECT id INTO aff_id FROM public.affiliates WHERE code = UPPER(ref_code) AND status = 'active';
    IF aff_id IS NOT NULL THEN
      UPDATE public.organizations SET referred_by = aff_id WHERE id = org_id;
      INSERT INTO public.affiliate_referrals (affiliate_id, organization_id, referred_user_id, status)
      VALUES (aff_id, org_id, new.id, 'registered');
    END IF;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add TRIAL to billing_plans if it doesn't exist
INSERT INTO billing_plans (slug, name, price_cents, stripe_price_id)
VALUES ('TRIAL', 'Trial', 0, NULL)
ON CONFLICT (slug) DO NOTHING;
