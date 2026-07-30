import { AppError } from '../middleware/error-handler.js';

export class WorkOrderNotFoundError extends AppError {
  constructor(id: string) {
    super(404, `Work order '${id}' not found`);
  }
}

export class WorkOrderNotOpenError extends AppError {
  constructor(status: string) {
    super(400, `Work order cannot be modified in '${status}' status`);
  }
}

export class QuotationNotApprovedError extends AppError {
  constructor(id: string) {
    super(400, `Quotation '${id}' must be approved to create a work order`);
  }
}

export class WorkOrderAlreadyExistsError extends AppError {
  constructor(quotationId: string) {
    super(409, `A work order for quotation '${quotationId}' already exists`);
  }
}
