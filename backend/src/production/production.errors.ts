import { AppError } from '../middleware/error-handler.js';

export class ProductionItemNotFoundError extends AppError {
  constructor(id: string) {
    super(404, `Production item '${id}' not found`);
  }
}

export class InvalidStageTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(400, `Cannot transition from '${from}' to '${to}'`);
  }
}

export class StageAlreadyCompletedError extends AppError {
  constructor(stage: string) {
    super(400, `Stage '${stage}' is already completed`);
  }
}

export class ChassisRecordNotFoundError extends AppError {
  constructor(id: string) {
    super(404, `Chassis record '${id}' not found`);
  }
}

export class ProductionItemAlreadyCompletedError extends AppError {
  constructor() {
    super(400, 'Production item is already completed');
  }
}

export class WorkOrderNotFoundError extends AppError {
  constructor(id: string) {
    super(404, `Work order '${id}' not found`);
  }
}
