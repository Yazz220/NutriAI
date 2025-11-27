
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(url, key);

async function test() {
    console.log('Testing connection to:', url);
    const { data, error } = await supabase.from('recipes').select('count', { count: 'exact', head: true });

    if (error) {
        console.error('Connection failed:', error);
    } else {
        console.log('Connection successful. Data:', data);
    }
}

test();
