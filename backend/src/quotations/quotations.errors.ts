import { AppError } from '../middleware/error-handler.js';

export class QuotationNotFoundError extends AppError {
  constructor(id: string) {
    super(404, `Quotation '${id}' not found`);
  }
}

export class QuotationNotDraftError extends AppError {
  constructor(status: string) {
    super(400, `Quotation cannot be modified in '${status}' status`);
  }
}

export class InvalidStatusTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(400, `Cannot transition quotation from '${from}' to '${to}'`);
  }
}

export class QuotationAlreadyApprovedError extends AppError {
  constructor() {
    super(400, 'Quotation is already approved');
  }
}

export class QuotationAlreadyDeniedError extends AppError {
  constructor() {
    super(400, 'Quotation is already denied');
  }
}

export class QuotationNotPendingError extends AppError {
  constructor(status: string) {
    super(400, `Quotation must be 'Pending' to approve or deny, currently '${status}'`);
  }
}

export class QuotationApprovalUnauthorizedError extends AppError {
  constructor() {
    super(403, 'Only admin and manager roles can approve or deny quotations');
  }
}

export class DenyReasonRequiredError extends AppError {
  constructor() {
    super(400, 'A reason is required when denying a quotation');
  }
}

export class TemplatePricingNotFoundError extends AppError {
  constructor(templateKey: string) {
    super(400, `Template '${templateKey}' not found for pricing calculation`);
  }
}

export class SpecOptionNotFoundError extends AppError {
  constructor(specKey: string, value: string) {
    super(400, `Option '${value}' not found for spec '${specKey}'`);
  }
}
