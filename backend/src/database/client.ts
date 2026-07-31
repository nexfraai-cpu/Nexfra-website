import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

console.log('URL:', config.supabaseUrl);
console.log('Service key:', config.supabaseServiceKey.substring(0, 15));
console.log('Length:', config.supabaseServiceKey.length);

// Service Role client
// Use for ALL database queries, storage, and admin operations.
export const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'nexfra-erp-api',
    },
  },
});

// Anonymous client
// Use ONLY for login, refresh, logout, password reset, etc.
export const authSupabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

logger.info('Supabase clients initialized');
