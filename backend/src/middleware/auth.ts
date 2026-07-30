import { Request, Response, NextFunction } from 'express';
import { supabase } from '../database/client.js';
import { AuthError } from './error-handler.js';
import { logger } from '../config/logger.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        authId: string;
        role: string;
        email: string;
        name: string;
      };
    }
  }
}

export async function auth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(new AuthError('Missing or malformed authorization header'));
  }

  const token = header.slice(7);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    logger.warn({ ip: req.ip }, 'Authentication failed — invalid or expired token');
    return next(new AuthError('Invalid or expired token'));
  }

  const authId = data.user.id;
  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('id, role, full_name')
    .eq('auth_id', authId)
    .is('deleted_at', null)
    .single();

  if (empError || !employee) {
    logger.warn({ authId }, 'No employee record linked to auth user');
    return next(new AuthError('Employee record not found'));
  }

  if (employee.role === 'Disabled') {
    return next(new AuthError('Account is disabled'));
  }

  req.user = {
    id: employee.id,
    authId,
    role: employee.role,
    email: data.user.email ?? '',
    name: employee.full_name,
  };

  next();
}
