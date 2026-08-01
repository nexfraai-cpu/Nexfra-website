import { supabase, authSupabase } from '../database/client.js';
import { config } from '../config/index.js';

export class AuthQueries {
  async signIn(email: string, password: string) {
    return authSupabase.auth.signInWithPassword({ email, password });
  }

  async signOut(accessToken: string) {
    return supabase.auth.admin.signOut(accessToken);
  }

  async refreshSession(refreshToken: string) {
    return authSupabase.auth.refreshSession({
      refresh_token: refreshToken,
    });
  }

  async getUser(token: string) {
    return supabase.auth.getUser(token);
  }

  async getEmployeeByAuthId(authId: string) {
    return supabase
      .from('employees')
      .select('*')
      .eq('auth_id', authId)
      .is('deleted_at', null)
      .single();
  }

  async updateLastLogin(employeeId: string) {
    return supabase
      .from('employees')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', employeeId);
  }

  async updatePassword(newPassword: string) {
    return authSupabase.auth.updateUser({
      password: newPassword,
    });
  }

  async sendPasswordResetEmail(email: string) {
    const redirectTo = config.isProd()
      ? 'https://erp.nexfra.in/reset-password'
      : 'http://localhost:3000/reset-password';

    return authSupabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
  }

  async signUp(email: string, password: string, fullName: string, role: string) {
    return authSupabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    });
  }
}
