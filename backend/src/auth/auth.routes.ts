import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthQueries } from './auth.queries.js';
import { validate } from '../middleware/validate.js';
import { auth } from '../middleware/auth.js';
import {
  loginSchema,
  refreshSchema,
  forgotPasswordSchema,
  updatePasswordSchema,
} from './auth.validator.js';
import { rateLimit } from 'express-rate-limit';

const queries = new AuthQueries();
const service = new AuthService(queries);
const controller = new AuthController(service);

export const authRouter = Router();

// Rate limit login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TooManyRequests', message: 'Too many login attempts. Try again in 15 minutes.' },
});

authRouter.post('/login', loginLimiter, validate(loginSchema), controller.login);

authRouter.post('/logout', auth, controller.logout);

authRouter.get('/me', auth, controller.me);

authRouter.post('/refresh', validate(refreshSchema), controller.refresh);

authRouter.post('/forgot-password', validate(forgotPasswordSchema), controller.forgotPassword);

authRouter.post('/update-password', auth, validate(updatePasswordSchema), controller.updatePassword);
