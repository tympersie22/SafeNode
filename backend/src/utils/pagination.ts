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

