import { AppError } from '../middleware/error-handler.js';

export class InvalidCredentialsError extends AppError {
  constructor() {
    super(401, 'Invalid email or password');
  }
}

export class AccountDisabledError extends AppError {
  constructor() {
    super(403, 'Account is disabled. Contact an administrator.');
  }
}

export class MfaRequiredError extends AppError {
  public mfaToken: string;

  constructor(mfaToken: string) {
    super(401, 'Multi-factor authentication required');
    this.mfaToken = mfaToken;
  }
}

export class PasswordResetRequiredError extends AppError {
  constructor() {
    super(401, 'Password reset required. Check your email.');
  }
}

export class SessionExpiredError extends AppError {
  constructor() {
    super(401, 'Session expired. Please login again.');
  }
}

export class RefreshTokenInvalidError extends AppError {
  constructor() {
    super(401, 'Invalid or expired refresh token');
  }
}

export class EmailNotVerifiedError extends AppError {
  constructor() {
    super(403, 'Email not verified. Please check your inbox.');
  }
}
