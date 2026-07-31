import { AnyZodObject, ZodError } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './error-handler.js';

export function validate(schema: AnyZodObject) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        console.log(`[VALIDATION ERROR 400] Route: ${req.method} ${req.originalUrl || req.url} Body:`, JSON.stringify(req.body), `Details:`, JSON.stringify(details));
        next(new ValidationError('Validation failed', details));
      } else {
        next(err);
      }
    }
  };
}
