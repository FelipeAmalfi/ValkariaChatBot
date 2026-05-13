export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus: number,
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const detail = id ? ` with id '${id}'` : ''
    super(`${resource}${detail} not found`, 'NOT_FOUND', 404)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 'UNAUTHORIZED', 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 'FORBIDDEN', 403)
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 'CONFLICT', 409)
  }
}

export class InfrastructureError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 'INFRASTRUCTURE_ERROR', 500)
    if (cause instanceof Error) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`
    }
  }
}

export class RepositoryError extends AppError {
  constructor(operation: string, cause?: unknown) {
    super(`Database error during '${operation}'`, 'REPOSITORY_ERROR', 500)
    if (cause instanceof Error) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`
    }
  }
}

export class AIProviderError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, 'AI_PROVIDER_ERROR', 502)
    if (cause instanceof Error) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`
    }
  }
}
