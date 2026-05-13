import type { FastifyInstance, FastifyError } from 'fastify'
import { ZodError } from 'zod'
import { AppError } from '../../core/domain/errors/AppError.js'

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError | Error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.httpStatus).send({
        error: {
          code: error.code,
          message: error.message,
        },
      })
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors,
        },
      })
    }

    // Fastify validation errors (JSON schema)
    if ('statusCode' in error && error.statusCode === 400) {
      return reply.status(400).send({
        error: {
          code: 'BAD_REQUEST',
          message: error.message,
        },
      })
    }

    app.log.error(error, 'Unhandled error')

    return reply.status(500).send({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      },
    })
  })
}
