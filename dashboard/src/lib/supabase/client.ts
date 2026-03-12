import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null

export const createClient = () => {
    if (!_client) {
        _client = createBrowserClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
    }
    return _client
}
