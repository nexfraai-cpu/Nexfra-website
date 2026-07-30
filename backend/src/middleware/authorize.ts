import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from './error-handler.js';

export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Role '${req.user.role}' does not have permission for this resource`
        )
      );
    }
    next();
  };
}
