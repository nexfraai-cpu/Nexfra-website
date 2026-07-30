import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

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

logger.info('Supabase client initialized');
