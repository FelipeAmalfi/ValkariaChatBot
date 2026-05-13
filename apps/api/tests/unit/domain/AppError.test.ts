import { describe, it, expect } from 'vitest'
import {
  AppError,
  NotFoundError,
  ValidationError,
  RepositoryError,
} from '../../../src/core/domain/errors/AppError.js'

describe('AppError hierarchy', () => {
  it('creates AppError with correct properties', () => {
    const err = new AppError('Test error', 'TEST_CODE', 400)
    expect(err.message).toBe('Test error')
    expect(err.code).toBe('TEST_CODE')
    expect(err.httpStatus).toBe(400)
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AppError)
  })

  it('creates NotFoundError with 404 status', () => {
    const err = new NotFoundError('Character', 'abc-123')
    expect(err.code).toBe('NOT_FOUND')
    expect(err.httpStatus).toBe(404)
    expect(err.message).toContain('Character')
    expect(err.message).toContain('abc-123')
  })

  it('creates ValidationError with 400 status', () => {
    const err = new ValidationError('Invalid name')
    expect(err.code).toBe('VALIDATION_ERROR')
    expect(err.httpStatus).toBe(400)
  })

  it('creates RepositoryError with 500 status', () => {
    const err = new RepositoryError('findById', new Error('Connection refused'))
    expect(err.code).toBe('REPOSITORY_ERROR')
    expect(err.httpStatus).toBe(500)
    expect(err.stack).toContain('Connection refused')
  })
})
