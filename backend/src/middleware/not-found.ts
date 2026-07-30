import { Request, Response } from 'express';
import { NotFoundError } from './error-handler.js';

export function notFoundHandler(_req: Request, _res: Response) {
  throw new NotFoundError(`Route not found: ${_req.method} ${_req.path}`);
}
