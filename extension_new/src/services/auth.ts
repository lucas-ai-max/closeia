import { createClient } from '@supabase/supabase-js';

// These should eventually come from build env vars
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        persistSession: false, // We handle persistence manually in chrome.storage
        autoRefreshToken: false,
        detectSessionInUrl: false
    }
});

export const authService = {
    async login(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        if (data.session) {
            await this.saveSession(data.session);
        }
        return data;
    },

    async saveSession(session: any) {
        await chrome.storage.local.set({
            supabase_session: session,
            access_token: session.access_token,
            refresh_token: session.refresh_token
        });
    },

    async getSession() {
        const data = await chrome.storage.local.get(['supabase_session']);
        return data.supabase_session;
    },

    async logout() {
        await supabase.auth.signOut();
        await chrome.storage.local.remove(['supabase_session', 'access_token', 'refresh_token']);
    }
};
