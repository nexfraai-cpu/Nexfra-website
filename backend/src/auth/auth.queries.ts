import { supabase } from '../database/client.js';

export class AuthQueries {
  async signIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  }

  async signOut(accessToken: string) {
    const client = supabase;
    client.auth.setSession({ access_token: accessToken, refresh_token: '' });
    return client.auth.signOut();
  }

  async refreshSession(refreshToken: string) {
    return supabase.auth.refreshSession({ refresh_token: refreshToken });
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
    return supabase.auth.updateUser({ password: newPassword });
  }

  async sendPasswordResetEmail(email: string) {
    const redirectTo =
      process.env.NODE_ENV === 'production'
        ? 'https://erp.nexfra.in/reset-password'
        : 'http://localhost:3000/reset-password';
    return supabase.auth.resetPasswordForEmail(email, { redirectTo });
  }

  async signUp(email: string, password: string, fullName: string, role: string) {
    return supabase.auth.signUp({
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
