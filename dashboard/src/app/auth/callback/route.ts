import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

/**
 * Auth callback: troca o code por sessão e redireciona.
 * Handles OAuth (Google), magic links, and password recovery.
 */
export async function GET(request: Request) {
    const requestUrl = new URL(request.url)
    const code = requestUrl.searchParams.get('code')
    const type = requestUrl.searchParams.get('type')

    if (code) {
        const cookieStore = await cookies()
        const supabase = createClient(cookieStore)
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
            return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin))
        }
    }

    // Password recovery flow -> redirect to reset password page
    if (type === 'recovery') {
        return NextResponse.redirect(new URL('/reset-password', requestUrl.origin))
    }

    return NextResponse.redirect(new URL('/dashboard', requestUrl.origin))
}
