export class BaseError extends Error {
  public statusCode: number;
  public details?: Record<string, any>;

  constructor(message: string, statusCode: number = 500, details?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, BaseError.prototype);
  }
}

export class AuthenticationError extends BaseError {
  constructor(message: string = 'Authentication failed', details?: Record<string, any>) {
    super(message, 401, details);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class AuthorizationError extends BaseError {
  constructor(message: string = 'You do not have permission to perform this action', details?: Record<string, any>) {
    super(message, 403, details);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }
}

export class NotFoundError extends BaseError {
  constructor(resource: string = 'Resource', details?: Record<string, any>) {
    super(`${resource} not found`, 404, details);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class ValidationError extends BaseError {
  constructor(message: string = 'Validation failed', details?: Record<string, any>) {
    super(message, 400, details);
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class RateLimitError extends BaseError {
  constructor(message: string = 'Rate limit exceeded', details?: Record<string, any>) {
    super(message, 429, details);
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class ServerError extends BaseError {
  constructor(message: string = 'Internal server error', details?: Record<string, any>) {
    super(message, 500, details);
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}

export class ConflictError extends BaseError {
  constructor(message: string = 'Resource conflict', details?: Record<string, any>) {
    super(message, 409, details);
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}