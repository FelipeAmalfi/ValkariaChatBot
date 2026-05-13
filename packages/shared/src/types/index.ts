export type ID = string

export type Timestamp = string

export interface Pagination {
  page: number
  pageSize: number
  total: number
}

export interface PaginationInput {
  page?: number
  pageSize?: number
}

export interface TimestampedEntity {
  createdAt: Timestamp
  updatedAt: Timestamp
}

export type Nullable<T> = T | null

export type Optional<T> = T | undefined

export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P]
}
