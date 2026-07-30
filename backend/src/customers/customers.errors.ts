import { AppError } from '../middleware/error-handler.js';

export class CustomerNotFoundError extends AppError {
  constructor(id: string) {
    super(404, `Customer '${id}' not found`);
  }
}

export class CustomerGstConflictError extends AppError {
  constructor(gst: string) {
    super(409, `A customer with GST '${gst}' already exists`);
  }
}

export class InvalidPaginationError extends AppError {
  constructor() {
    super(400, 'Invalid pagination parameters. page must be >= 1, perPage must be 1-100.');
  }
}
