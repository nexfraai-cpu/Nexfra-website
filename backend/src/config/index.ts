import dotenv from 'dotenv';

dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const config = {
  nodeEnv: optional('NODE_ENV', 'development'),

  port: Number(optional('PORT', '4000')),
  host: optional('HOST', '0.0.0.0'),

  trustProxy: (optional('TRUST_PROXY', '') ||
    (process.env.NODE_ENV === 'production' ? '1' : '0')) as boolean | string,

  isDev: () => config.nodeEnv === 'development',
  isProd: () => config.nodeEnv === 'production',

  // Supabase
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceKey: required('SUPABASE_SERVICE_KEY'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),

  // CORS
  corsOrigins: optional('CORS_ORIGINS', 'http://localhost:3000').split(','),

  // Logging
  logLevel: optional('LOG_LEVEL', 'info'),

  // Rate limiting
  rateLimitWindowMs: Number(optional('RATE_LIMIT_WINDOW_MS', '60000')),
  rateLimitMax: Number(optional('RATE_LIMIT_MAX', '100')),

  // Uploads
  uploadMaxSize: Number(optional('UPLOAD_MAX_SIZE', '10485760')),
  allowedMimeTypes: optional('ALLOWED_MIME_TYPES', 'image/jpeg,image/png,application/pdf').split(
    ',',
  ),

  // Storage
  storageBucketQuotations: optional('STORAGE_BUCKET_QUOTATIONS', 'quotation-pdfs'),
  storageBucketAttachments: optional('STORAGE_BUCKET_ATTACHMENTS', 'attachments'),
  storageBucketAssets: optional('STORAGE_BUCKET_ASSETS', 'company-assets'),
};
