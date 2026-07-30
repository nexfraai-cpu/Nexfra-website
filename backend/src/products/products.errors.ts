import { AppError } from '../middleware/error-handler.js';

export class ProductNotFoundError extends AppError {
  constructor(key: string) {
    super(404, `Product '${key}' not found`);
  }
}

export class ProductConflictError extends AppError {
  constructor(key: string) {
    super(409, `A product with key '${key}' already exists`);
  }
}

export class TemplateNotFoundError extends AppError {
  constructor(key: string) {
    super(404, `Template '${key}' not found`);
  }
}

export class TemplateConflictError extends AppError {
  constructor(key: string) {
    super(409, `A template with key '${key}' already exists in this product`);
  }
}

export class SpecNotFoundError extends AppError {
  constructor(key: string) {
    super(404, `Spec '${key}' not found`);
  }
}

export class SpecConflictError extends AppError {
  constructor(key: string) {
    super(409, `A spec with key '${key}' already exists in this template`);
  }
}

export class OptionNotFoundError extends AppError {
  constructor(name: string) {
    super(404, `Option '${name}' not found`);
  }
}

export class OptionConflictError extends AppError {
  constructor(name: string) {
    super(409, `An option with name '${name}' already exists in this spec`);
  }
}

export class InvalidSpecTypeError extends AppError {
  constructor(type: string) {
    super(400, `'${type}' is not a valid spec type. Must be dropdown, text, number, checkbox, or radio.`);
  }
}
