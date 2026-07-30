import { Logger } from './Logger.js';

export class AppError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', status = 500) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource, id) {
    super(`${resource} '${id}' not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

export class AuthError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthError';
  }
}

export function handleError(error, context = '') {
  if (error instanceof AppError) {
    Logger.warn(`${context}: ${error.message} (${error.code})`);
  } else {
    Logger.error(`${context}: ${error.message}`);
  }
  return error;
}

export function showError(message, toastFn) {
  if (toastFn) {
    toastFn(message, 'error');
  } else {
    alert(message);
  }
}
