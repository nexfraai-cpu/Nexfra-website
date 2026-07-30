export interface AuthTokens {
  token: string;
  refreshToken: string;
  expiresAt: number;
}

export interface UserProfile {
  id: string;
  authId: string;
  email: string;
  name: string;
  role: 'admin' | 'sales' | 'finance' | 'manager';
  employeeNumber: string;
  lastLoginAt: string | null;
}

export interface LoginResponse {
  user: UserProfile;
  session: AuthTokens;
}

export interface MfaRequired {
  requiresMfa: true;
  mfaType: 'totp';
  mfaToken: string;
}

export type LoginResult = LoginResponse | MfaRequired;

export interface RefreshResponse {
  session: AuthTokens;
}
