import { createClient } from '@supabase/supabase-js';

// These should eventually come from build env vars
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

function getSupabaseAuthStorageKey(): string {
    try {
        const hostname = new URL(SUPABASE_URL || 'https://default.supabase.co').hostname;
        return `sb-${hostname.split('.')[0]}-auth-token`;
    } catch {
        return 'sb-default-auth-token';
    }
}

const isDev = !('update_url' in chrome.runtime.getManifest());

let supabase: any;

try {
    supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
            storage: {
                getItem: (key: string) => new Promise((resolve) => chrome.storage.local.get([key], (result) => resolve((result[key] as string) || null))),
                setItem: (key: string, value: string) => new Promise((resolve) => chrome.storage.local.set({ [key]: value }, resolve)),
                removeItem: (key: string) => new Promise((resolve) => chrome.storage.local.remove([key], resolve)),
            }
        }
    });
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
        const authKey = getSupabaseAuthStorageKey();
        const payload: Record<string, unknown> = {
            supabase_session: session,
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            [authKey]: JSON.stringify(session),
        };
        await chrome.storage.local.set(payload);
    },

    async getSession(): Promise<any> {
        const data = await chrome.storage.local.get(['supabase_session']);
        return data.supabase_session;
    },

    async restoreSessionInMemory(session: any): Promise<void> {
        if (!session?.access_token || !session?.refresh_token) return;
        try {
            await supabase.auth.setSession({
                access_token: session.access_token,
                refresh_token: session.refresh_token,
            });
        } catch (e) {
            console.warn('restoreSessionInMemory failed', e);
        }
    },

    async logout() {
        const authKey = getSupabaseAuthStorageKey();
        await supabase.auth.signOut();
        await chrome.storage.local.remove(['supabase_session', 'access_token', 'refresh_token', authKey]);
    },

    async fetchOrganizationPlan(): Promise<{ plan: string; organizationId: string } | null> {
        try {
            const { data: { user }, error: userErr } = await supabase.auth.getUser();
            if (userErr || !user) return null;
            const { data: profile, error: profErr } = await supabase
                .from('profiles')
                .select('organization_id')
                .eq('id', user.id)
                .single();
            if (profErr || !profile?.organization_id) return null;
            const { data: org, error: orgErr } = await supabase
                .from('organizations')
                .select('plan')
                .eq('id', profile.organization_id)
                .single();
            if (orgErr || !org) return null;
            return { plan: org.plan || 'FREE', organizationId: profile.organization_id };
        } catch {
            return null;
        }
    },

    async getFreshToken(): Promise<string> {
        // 1. Tentar pegar sessão do Supabase (memória)
        let { data: { session }, error } = await supabase.auth.getSession();

        // 2. Se não tiver em memória, tentar recuperar do storage (background reiniciou / extensão recarregada)
        if (!session) {
            if (isDev) console.warn('No session in memory, recovering from storage...');
            const storedSession = await this.getSession();
            if (storedSession && storedSession.refresh_token) {
                const { data: setData, error: setErr } = await supabase.auth.setSession({
                    access_token: storedSession.access_token,
                    refresh_token: storedSession.refresh_token
                });

                if (!setErr && setData.session) {
                    session = setData.session;
                    await this.saveSession(setData.session);
                } else if (storedSession.refresh_token) {
                    if (isDev) console.warn('setSession failed, trying refreshSession...');
                    const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession({
                        refresh_token: storedSession.refresh_token
                    });
                    if (!refreshErr && refreshData.session) {
                        session = refreshData.session;
                        await this.saveSession(refreshData.session);
                    } else {
                        console.error('Failed to restore session:', setErr?.message || refreshErr?.message);
                    }
                } else {
                    console.error('Failed to restore session: Auth session missing');
                }
            }
        }

        if (!session) {
            throw new Error('No session found');
        }

        const expiresAt = session.expires_at || 0;
        const now = Math.floor(Date.now() / 1000);
        const timeLeft = expiresAt - now;

        // Se expira em menos de 5 minutos, forçar refresh
        if (timeLeft < 300) {
            const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();

            if (refreshErr || !refreshData.session) {
                console.error('Token refresh failed:', refreshErr?.message);
                return session.access_token;
            }

            await this.saveSession(refreshData.session);
            return refreshData.session.access_token;
        }

        return session.access_token;
    }
};
