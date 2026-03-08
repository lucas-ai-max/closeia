import { createBrowserClient } from '@supabase/ssr'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export const api = {
    get: async (endpoint: string) => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) throw new Error('Unauthorized')

        const res = await fetch(`${API_URL}${endpoint}`, {
            headers: {
                Authorization: `Bearer ${session.access_token}`,
            },
        })

        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
            const message = (data?.error as string) || res.statusText
            throw new Error(message)
        }
        return data
    },

    post: async (endpoint: string, body: any) => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) throw new Error('Unauthorized')

        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(body),
        })

        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
            const message = (data?.error as string) || res.statusText
            throw new Error(message)
        }
        return data
    },

    put: async (endpoint: string, body: any) => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) throw new Error('Unauthorized')

        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify(body),
        })

        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
            const message = (data?.error as string) || res.statusText
            throw new Error(message)
        }
        return data
    },

    upload: async (endpoint: string, formData: FormData) => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) throw new Error('Unauthorized')

        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${session.access_token}`,
            },
            body: formData,
        })

        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
            const message = (data?.error as string) || res.statusText
            throw new Error(message)
        }
        return data
    },

    delete: async (endpoint: string) => {
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) throw new Error('Unauthorized')

        const res = await fetch(`${API_URL}${endpoint}`, {
            method: 'DELETE',
            headers: {
                Authorization: `Bearer ${session.access_token}`,
            },
        })

        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
            const message = (data?.error as string) || res.statusText
            throw new Error(message)
        }
        return data
    }
}
