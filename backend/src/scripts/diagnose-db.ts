import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root backend .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('--- DIAGNOSTIC START ---');
console.log(`PWD: ${process.cwd()}`);
console.log(`SUPABASE_URL: ${url ? 'DEFINED' : 'MISSING'} (${url?.substring(0, 10)}...)`);
console.log(`SUPABASE_SERVICE_ROLE_KEY: ${key ? 'DEFINED' : 'MISSING'} (Length: ${key?.length})`);

if (!url || !key) {
    console.error('❌ Missing environment variables!');
    process.exit(1);
}

const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
    try {
        console.log('1. Testing Connection (Select Profiles)...');
        const { data: profiles, error: profileError } = await supabase.from('profiles').select('count', { count: 'exact', head: true });

        if (profileError) {
            console.error('❌ Profile Select Failed:', profileError);
        } else {
            console.log(`✅ Profile Check OK. Count: ${profiles}`);
        }

        console.log('2. Testing Insert Call...');
        // Need a valid user ID. Let's try to get one first.
        const { data: user } = await supabase.from('profiles').select('id, organization_id').limit(1).single();

        if (!user) {
            console.error('⚠️ No users found to test insert.');
            return;
        }

        console.log(`   Using User ID: ${user.id}`);
        const callData = {
            user_id: user.id,
            organization_id: user.organization_id,
            status: 'TEST_DIAGNOSTIC',
            platform: 'TEST',
            started_at: new Date().toISOString()
        };

        const { data: call, error: insertError } = await supabase.from('calls').insert(callData).select().single();

        if (insertError) {
            console.error('❌ Insert Call Failed:', insertError);
            console.error('   Details:', JSON.stringify(insertError, null, 2));
        } else {
            console.log(`✅ Insert Call OK. ID: ${call.id}`);
            // Cleanup
            await supabase.from('calls').delete().eq('id', call.id);
            console.log('✅ Cleanup OK');
        }

    } catch (err) {
        console.error('❌ Unexpected Error:', err);
    } finally {
        console.log('--- DIAGNOSTIC END ---');
    }
}

run();
