import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLatestCall() {
    console.log(`Checking latest call...`);

    // Check call details
    const { data: calls, error } = await supabase
        .from('calls')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error('Error fetching call:', error);
        return;
    }

    if (!calls || calls.length === 0) {
        console.log('No calls found!');
        return;
    }

    const call = calls[0];
    console.log('Latest Call Found:', {
        id: call.id,
        started_at: call.started_at,
        status: call.status,
        transcript_count: Array.isArray(call.transcript) ? call.transcript.length : 0
    });

    if (call.transcript && Array.isArray(call.transcript) && call.transcript.length > 0) {
        console.log('First transcript segment:', call.transcript[0]);
        console.log('Last transcript segment:', call.transcript[call.transcript.length - 1]);
    } else {
        console.log('⚠️ Transcript is empty or invalid format');
    }
}

checkLatestCall();
