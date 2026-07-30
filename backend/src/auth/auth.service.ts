import { supabase } from '../database/client.js';
import { AuthQueries } from './auth.queries.js';
import {
  InvalidCredentialsError,
  AccountDisabledError,
  SessionExpiredError,
  RefreshTokenInvalidError,
} from './auth.errors.js';
import {
  LoginResult,
  RefreshResponse,
  UserProfile,
  AuthTokens,
} from './auth.types.js';
import { logger } from '../config/logger.js';

export class AuthService {
  constructor(private queries: AuthQueries) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const { data, error } = await this.queries.signIn(email, password);

    if (error) {
      logger.warn({ email, code: error.code }, 'Login failed');
      if (error.message?.includes('Email not confirmed')) {
        throw await this._handleUnconfirmedEmail(email, password);
      }
      throw new InvalidCredentialsError();
    }

    if (!data.session) {
      throw new InvalidCredentialsError();
    }

    if ((data.session as any)?.mfa_required) {
      return {
        requiresMfa: true,
        mfaType: 'totp',
        mfaToken: (data.session as any).mfa_token,
      };
    }

    const employee = await this._getEmployeeByAuthId(data.user.id);
    if (!employee) {
      await this.queries.signOut(data.session.access_token);
      logger.error({ authId: data.user.id }, 'Authenticated user has no employee record');
      throw new InvalidCredentialsError();
    }

    if (employee.status !== 'Active') {
      await this.queries.signOut(data.session.access_token);
      throw new AccountDisabledError();
    }

    await this.queries.updateLastLogin(employee.id);

    const user = this._mapUser(employee);
    const session: AuthTokens = {
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: Date.now() + (data.session.expires_in ?? 3600) * 1000,
    };

    logger.info({ employeeId: employee.id, role: employee.role }, 'Login successful');
    return { user, session };
  }

  async logout(accessToken: string): Promise<void> {
    const { error } = await this.queries.signOut(accessToken);
    if (error) {
      logger.warn({ code: error.code }, 'Logout produced non-fatal error');
    }
    logger.info('User logged out');
  }

  async refreshSession(refreshToken: string): Promise<RefreshResponse> {
    const { data, error } = await this.queries.refreshSession(refreshToken);

    if (error || !data.session) {
      logger.warn({ code: error?.code }, 'Session refresh failed');
      throw new RefreshTokenInvalidError();
    }

    const session: AuthTokens = {
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: Date.now() + (data.session.expires_in ?? 3600) * 1000,
    };

    return { session };
  }

  async getMeByAuthId(authId: string): Promise<UserProfile> {
    const employee = await this._getEmployeeByAuthId(authId);
    if (!employee) {
      throw new SessionExpiredError();
    }
    return this._mapUser(employee);
  }

  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await this.queries.updatePassword(newPassword);
    if (error) {
      logger.error({ code: error.code }, 'Password update failed');
      throw new InvalidCredentialsError();
    }
    logger.info('Password updated successfully');
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const { error } = await this.queries.sendPasswordResetEmail(email);
    if (error) {
      logger.error({ email, code: error.code }, 'Password reset email failed');
    }
    return { message: 'If the email exists, a password reset link has been sent.' };
  }

  private async _handleUnconfirmedEmail(email: string, _password: string): Promise<never> {
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: 'https://erp.nexfra.in' },
    });
    if (!resendError) {
      logger.info({ email }, 'Resent confirmation email');
    }
    throw new InvalidCredentialsError();
  }

  private async _getEmployeeByAuthId(authId: string) {
    const { data, error } = await this.queries.getEmployeeByAuthId(authId);
    if (error || !data) return null;
    return data;
  }

  private _mapUser(employee: any): UserProfile {
    return {
      id: employee.id,
      authId: employee.auth_id,
      email: employee.email,
      name: employee.full_name,
      role: employee.role,
      employeeNumber: employee.employee_number,
      lastLoginAt: employee.last_login_at,
    };
  }
}
