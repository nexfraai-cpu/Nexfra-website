import { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { asyncWrap } from '../middleware/async-wrap.js';

export class AuthController {
  constructor(private authService: AuthService) {}

  login = asyncWrap(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await this.authService.login(email, password);

    if ('requiresMfa' in result) {
      return res.status(200).json({
        requiresMfa: true,
        mfaType: result.mfaType,
        mfaToken: result.mfaToken,
      });
    }

    return res.status(200).json({
      data: {
        user: result.user,
        session: result.session,
      },
    });
  });

  logout = asyncWrap(async (req: Request, res: Response) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      await this.authService.logout(token);
    }
    res.status(200).json({ data: { message: 'Logged out successfully' } });
  });

  me = asyncWrap(async (req: Request, res: Response) => {
    const profile = await this.authService.getMeByAuthId(req.user!.authId);
    res.status(200).json({ data: profile });
  });

  refresh = asyncWrap(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const result = await this.authService.refreshSession(refreshToken);
    res.status(200).json({ data: result.session });
  });

  updatePassword = asyncWrap(async (req: Request, res: Response) => {
    const { password } = req.body;
    await this.authService.updatePassword(password);
    res.status(200).json({ data: { message: 'Password updated successfully' } });
  });

  forgotPassword = asyncWrap(async (req: Request, res: Response) => {
    const { email } = req.body;
    const result = await this.authService.forgotPassword(email);
    res.status(200).json({ data: result });
  });
}
