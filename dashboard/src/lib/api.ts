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

        if (!res.ok) throw new Error(`API Error: ${res.statusText}`)
        return res.json()
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

        if (!res.ok) throw new Error(`API Error: ${res.statusText}`)
        return res.json()
    }
}
