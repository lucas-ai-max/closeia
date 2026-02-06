import { createClient } from '@supabase/supabase-js';

// These should eventually come from build env vars
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Initializing Supabase with:', SUPABASE_URL ? 'URL Present' : 'URL Missing');

let supabase: any;

try {
    supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
            storage: {
                getItem: (key) => new Promise((resolve) => chrome.storage.local.get([key], (result) => resolve((result[key] as string) || null))),
                setItem: (key, value) => new Promise((resolve) => chrome.storage.local.set({ [key]: value }, resolve)),
                removeItem: (key) => new Promise((resolve) => chrome.storage.local.remove([key], resolve)),
            }
        }
    });
    console.log('Supabase client created successfully');
} catch (error) {
    console.error('Failed to create Supabase client:', error);
    throw error;
}

export { supabase };

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
