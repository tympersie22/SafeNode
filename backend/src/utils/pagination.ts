/**
 * Pagination Utilities
 * Helper functions for implementing pagination in API endpoints
 */

import { z } from 'zod'

export interface PaginationOptions {
  page?: number
  limit?: number
  offset?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * Pagination schema for Zod validation
 */
export const paginationSchema = z.object({
  page: z.string().optional().transform(val => {
    const parsed = val ? parseInt(val, 10) : 1
    return parsed > 0 ? parsed : 1
  }),
  limit: z.string().optional().transform(val => {
    const parsed = val ? parseInt(val, 10) : 20
    if (parsed < 1) return 20
    if (parsed > 100) return 100 // Max 100 items per page
    return parsed
  })
})

/**
 * Convert page/limit to offset/limit for database queries
 */
export function getPaginationParams(options: PaginationOptions): {
  skip: number
  take: number
  page: number
  limit: number
} {
  const page = options.page || 1
  const limit = options.limit || 20
  
  // Ensure page is at least 1
  const validPage = Math.max(1, page)
  // Ensure limit is between 1 and 100
  const validLimit = Math.min(Math.max(1, limit), 100)
  
  // Calculate offset from page
  const offset = (validPage - 1) * validLimit

  return {
    skip: offset,
    take: validLimit,
    page: validPage,
    limit: validLimit
  }
}

/**
 * Create paginated response
 */
export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit)

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }
}

/**
 * Add pagination headers to response
 */
export function addPaginationHeaders(
  reply: any,
  page: number,
  limit: number,
  total: number
): void {
  const totalPages = Math.ceil(total / limit)

  reply.header('X-Pagination-Page', page.toString())
  reply.header('X-Pagination-Limit', limit.toString())
  reply.header('X-Pagination-Total', total.toString())
  reply.header('X-Pagination-Total-Pages', totalPages.toString())
  reply.header('X-Pagination-Has-Next', (page < totalPages).toString())
  reply.header('X-Pagination-Has-Prev', (page > 1).toString())
}

/**
 * Parse pagination from query string
 */
export function parsePaginationFromQuery(query: any): PaginationOptions {
  const validation = paginationSchema.safeParse(query)
  
  if (validation.success) {
    return {
      page: validation.data.page,
      limit: validation.data.limit
    }
  }
  
  // Default pagination
  return {
    page: 1,
    limit: 20
  }
}

/**
 * Cursor-based pagination options
 */
export interface CursorPaginationOptions {
  cursor?: string
  limit?: number
  direction?: 'forward' | 'backward'
}

/**
 * Cursor-based pagination response
 */
export interface CursorPaginatedResponse<T> {
  data: T[]
  pagination: {
    cursor: string | null
    nextCursor: string | null
    prevCursor: string | null
    limit: number
    hasNext: boolean
    hasPrev: boolean
  }
}

/**
 * Create cursor from item (typically ID or timestamp)
 */
export function createCursor(value: string | number): string {
  return Buffer.from(String(value)).toString('base64url')
}

/**
 * Decode cursor to original value
 */
export function decodeCursor(cursor: string): string {
  try {
    return Buffer.from(cursor, 'base64url').toString('utf-8')
  } catch {
    throw new Error('Invalid cursor')
  }
}

/**
 * Create cursor-based paginated response
 */
export function createCursorPaginatedResponse<T>(
  data: T[],
  cursorField: (item: T) => string | number,
  limit: number,
  cursor?: string
): CursorPaginatedResponse<T> {
  const hasNext = data.length > limit
  const items = hasNext ? data.slice(0, limit) : data
  
  const lastItem = items.length > 0 ? items[items.length - 1] : null
  const firstItem = items.length > 0 ? items[0] : null
  
  return {
    data: items,
    pagination: {
      cursor: cursor || null,
      nextCursor: hasNext && lastItem ? createCursor(cursorField(lastItem)) : null,
      prevCursor: cursor || null,
      limit,
      hasNext,
      hasPrev: !!cursor
    }
  }
}

/**
 * Sorting options
 */
export interface SortOptions {
  field: string
  direction: 'asc' | 'desc'
}

/**
 * Parse sort from query string
 * Format: ?sort=field:asc or ?sort=field:desc
 */
export function parseSortFromQuery(query: any, defaultField: string = 'createdAt', defaultDirection: 'asc' | 'desc' = 'desc'): SortOptions {
  const sortParam = query?.sort || query?.orderBy
  
  if (!sortParam || typeof sortParam !== 'string') {
    return {
      field: defaultField,
      direction: defaultDirection
    }
  }
  
  const parts = sortParam.split(':')
  const field = parts[0] || defaultField
  const direction = (parts[1]?.toLowerCase() === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'
  
  return {
    field,
    direction
  }
}

/**
 * Validate sort field against allowed fields
 */
export function validateSortField(field: string, allowedFields: string[]): boolean {
  return allowedFields.includes(field)
}

