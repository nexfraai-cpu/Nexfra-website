import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, message, details);
  }
}

export class AuthError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(403, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(409, message);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    console.log(`[APP ERROR ${err.statusCode}] Method: ${req.method} Path: ${req.originalUrl || req.url} Name: ${err.name} Message: ${err.message}`, JSON.stringify(err.details ?? {}));
    logger.warn(
      { statusCode: err.statusCode, name: err.name, details: err.details },
      err.message,
    );
    return res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
      details: err.details,
    });
  }

  const anyErr = err as any;
  console.error(
    `[UNHANDLED ERROR] Method: ${req.method} Path: ${req.originalUrl || req.url} Code: ${anyErr?.code ?? 'N/A'} Message: ${err.message} Details: ${JSON.stringify(anyErr?.details ?? {})}`,
  );
  logger.error(
    {
      err,
      method: req.method,
      path: req.originalUrl || req.url,
      pgCode: anyErr?.code,
      pgMessage: anyErr?.message,
      pgDetails: anyErr?.details,
      pgHint: anyErr?.hint,
    },
    'Unhandled internal error',
  );
  return res.status(500).json({
    error: 'InternalError',
    message: 'An unexpected error occurred',
  });
}
