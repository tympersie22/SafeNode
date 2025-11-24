/**
 * Pagination Utilities Tests
 */

import { describe, it, expect } from '@jest/globals'
import {
  getPaginationParams,
  createPaginatedResponse,
  parsePaginationFromQuery,
  addPaginationHeaders
} from '../src/utils/pagination'

describe('Pagination Utilities', () => {
  describe('getPaginationParams', () => {
    it('should return correct skip/take for page 1', () => {
      const result = getPaginationParams({ page: 1, limit: 20 })
      
      expect(result.skip).toBe(0)
      expect(result.take).toBe(20)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })

    it('should return correct skip/take for page 2', () => {
      const result = getPaginationParams({ page: 2, limit: 20 })
      
      expect(result.skip).toBe(20)
      expect(result.take).toBe(20)
      expect(result.page).toBe(2)
    })

    it('should cap limit at 100', () => {
      const result = getPaginationParams({ page: 1, limit: 200 })
      
      expect(result.limit).toBe(100)
      expect(result.take).toBe(100)
    })

    it('should use defaults', () => {
      const result = getPaginationParams({})
      
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
      expect(result.skip).toBe(0)
      expect(result.take).toBe(20)
    })
  })

  describe('createPaginatedResponse', () => {
    it('should create paginated response', () => {
      const data = [1, 2, 3, 4, 5]
      const result = createPaginatedResponse(data, 25, 1, 10)
      
      expect(result.data).toEqual(data)
      expect(result.pagination.total).toBe(25)
      expect(result.pagination.totalPages).toBe(3)
      expect(result.pagination.hasNext).toBe(true)
      expect(result.pagination.hasPrev).toBe(false)
    })

    it('should handle last page', () => {
      const data = [1, 2, 3]
      const result = createPaginatedResponse(data, 23, 3, 10)
      
      expect(result.pagination.hasNext).toBe(false)
      expect(result.pagination.hasPrev).toBe(true)
    })
  })

  describe('parsePaginationFromQuery', () => {
    it('should parse valid query params', () => {
      const result = parsePaginationFromQuery({ page: '2', limit: '50' })
      
      expect(result.page).toBe(2)
      expect(result.limit).toBe(50)
    })

    it('should use defaults for invalid params', () => {
      const result = parsePaginationFromQuery({ page: 'invalid', limit: 'invalid' })
      
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })

    it('should handle empty query', () => {
      const result = parsePaginationFromQuery({})
      
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
    })
  })
})

