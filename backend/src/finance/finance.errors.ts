import { AppError } from '../middleware/error-handler.js';

export class SaleNotFoundError extends AppError {
  constructor(id: string) {
    super(404, `Sale '${id}' not found`);
  }
}

export class PaymentNotFoundError extends AppError {
  constructor(id: string) {
    super(404, `Payment '${id}' not found`);
  }
}

export class PaymentExceedsOutstandingError extends AppError {
  constructor(amount: number, outstanding: number) {
    super(400, `Payment amount ₹${amount} exceeds outstanding balance ₹${outstanding}`);
  }
}

export class InvoiceNumberConflictError extends AppError {
  constructor(invoiceNumber: string) {
    super(409, `Invoice number '${invoiceNumber}' already exists`);
  }
}

export class SaleAlreadyPaidError extends AppError {
  constructor() {
    super(400, 'Sale is already fully paid');
  }
}

export class InvalidPaymentModeError extends AppError {
  constructor(mode: string) {
    super(400, `'${mode}' is not a valid payment mode. Must be Cash, RTGS, Cheque, UPI, Card, or Other`);
  }
}

export class SaleNotEditableError extends AppError {
  constructor(status: string) {
    super(400, `Sale cannot be modified in '${status}' status`);
  }
}
