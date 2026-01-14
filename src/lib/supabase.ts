import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if we're in a browser environment and have valid config
const isConfigured = supabaseUrl && supabaseAnonKey;

if (!isConfigured && typeof window !== 'undefined') {
  console.error('Missing Supabase environment variables!');
}

// Create clients only if configured, otherwise create placeholder that will error on use
const createSupabaseClient = (): SupabaseClient => {
  if (!isConfigured) {
    // Return a minimal client that will fail gracefully during build
    return createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
    global: {
      headers: {
        'x-my-custom-header': 'capital21-app',
      },
    },
  });
};

const createSupabaseDbClient = (): SupabaseClient => {
  if (!isConfigured) {
    return createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

export const supabase = createSupabaseClient();

// Create a separate client for database operations to avoid abort conflicts
export const supabaseDb = createSupabaseDbClient();
