
import WebSocket from 'ws';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const WS_URL = 'ws://localhost:3001/ws/call';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
        console.log('Usage: npx tsx scripts/debug-ws.ts <email> <password>');
        process.exit(1);
    }

    console.log(`🔐 Logging in as ${email}...`);
    const { data: { session }, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error || !session) {
        console.error('❌ Login failed:', error?.message);
        process.exit(1);
    }

    const token = session.access_token;
    console.log('✅ Authenticated. Token length:', token.length);

    console.log(`🔌 Connecting to ${WS_URL}...`);
    const ws = new WebSocket(`${WS_URL}?token=${token}`);

    ws.on('open', () => {
        console.log('✅ Connected!');

        // Send a test message
        const msg = JSON.stringify({
            type: 'call:start',
            payload: {
                platform: 'debug',
                scriptId: 'default',
                leadName: 'Debug Lead',
                externalId: 'debug-' + Date.now()
            }
        });
        console.log('📤 Sending call:start...');
        ws.send(msg);
    });

    ws.on('message', (data) => {
        console.log('📩 Received:', data.toString());
    });

    ws.on('close', (code, reason) => {
        console.log(`❌ Closed: ${code} ${reason}`);
    });

    ws.on('error', (err) => {
        console.error('❌ Error:', err);
    });
}

main().catch(console.error);
