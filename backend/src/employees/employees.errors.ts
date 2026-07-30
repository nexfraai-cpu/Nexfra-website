import { AppError } from '../middleware/error-handler.js';

export class EmployeeNotFoundError extends AppError {
  constructor(id: string) {
    super(404, `Employee '${id}' not found`);
  }
}

export class EmployeeEmailConflictError extends AppError {
  constructor(email: string) {
    super(409, `An employee with email '${email}' already exists`);
  }
}

export class CannotDeleteSelfError extends AppError {
  constructor() {
    super(400, 'You cannot delete your own account');
  }
}

export class CannotDisableSelfError extends AppError {
  constructor() {
    super(400, 'You cannot disable your own account');
  }
}

export class CannotChangeOwnRoleError extends AppError {
  constructor() {
    super(400, 'You cannot change your own role. Ask another admin.');
  }
}

export class LastAdminCannotChangeRoleError extends AppError {
  constructor() {
    super(400, 'Cannot change role. At least one admin must remain.');
  }
}

export class LastAdminCannotDisableError extends AppError {
  constructor() {
    super(400, 'Cannot disable the last active admin account.');
  }
}

export class LastAdminCannotDeleteError extends AppError {
  constructor() {
    super(400, 'Cannot delete the last active admin account.');
  }
}

export class InvalidRoleAssignmentError extends AppError {
  constructor(role: string) {
    super(400, `'${role}' is not a valid role. Must be admin, sales, finance, or manager.`);
  }
}
