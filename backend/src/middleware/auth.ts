import { Request, Response, NextFunction } from 'express';
import { supabase } from '../database/client.js';
import { AuthError } from './error-handler.js';
import { logger } from '../config/logger.js';

export interface AuthenticatedUser {
  id: string;
  authId: string;
  role: 'admin' | 'sales' | 'finance' | 'manager';
  email: string;
  name: string;
  employeeNumber: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
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

  const { data: employee, error: empError } = await supabase
    .from('employees')
    .select('id, role, full_name, employee_number, status')
    .eq('auth_id', data.user.id)
    .is('deleted_at', null)
    .single();

  if (empError || !employee) {
    logger.warn({ authId: data.user.id }, 'No employee record linked to auth user');
    return next(new AuthError('Employee record not found'));
  }

  if (employee.status === 'Disabled') {
    return next(new AuthError('Account is disabled'));
  }

  req.user = {
    id: employee.id,
    authId: data.user.id,
    role: employee.role,
    email: data.user.email ?? '',
    name: employee.full_name,
    employeeNumber: employee.employee_number,
  };

  next();
}
