import { createClient } from '@supabase/supabase-js';
import { env } from '../../shared/config/env.js';
// TODO: Generate Database definitions with 'supabase gen types typescript' and import here
// import { Database } from '../../shared/types/supabase';

// Service Role Client - Bypass RLS - Backend ONLY
export const supabaseAdmin = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        }
    }
);

// Anon Client - Respects RLS - For user-context operations if needed
export const supabaseAnon = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY
);
