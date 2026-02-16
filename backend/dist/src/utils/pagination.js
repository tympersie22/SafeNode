"use strict";
/**
 * Pagination Utilities
 * Helper functions for implementing pagination in API endpoints
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.paginationSchema = void 0;
exports.getPaginationParams = getPaginationParams;
exports.createPaginatedResponse = createPaginatedResponse;
exports.addPaginationHeaders = addPaginationHeaders;
exports.parsePaginationFromQuery = parsePaginationFromQuery;
exports.createCursor = createCursor;
exports.decodeCursor = decodeCursor;
exports.createCursorPaginatedResponse = createCursorPaginatedResponse;
exports.parseSortFromQuery = parseSortFromQuery;
exports.validateSortField = validateSortField;
const zod_1 = require("zod");
/**
 * Pagination schema for Zod validation
 */
exports.paginationSchema = zod_1.z.object({
    page: zod_1.z.string().optional().transform(val => {
        const parsed = val ? parseInt(val, 10) : 1;
        return parsed > 0 ? parsed : 1;
    }),
    limit: zod_1.z.string().optional().transform(val => {
        const parsed = val ? parseInt(val, 10) : 20;
        if (parsed < 1)
            return 20;
        if (parsed > 100)
            return 100; // Max 100 items per page
        return parsed;
    })
});
/**
 * Convert page/limit to offset/limit for database queries
 */
function getPaginationParams(options) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    // Ensure page is at least 1
    const validPage = Math.max(1, page);
    // Ensure limit is between 1 and 100
    const validLimit = Math.min(Math.max(1, limit), 100);
    // Calculate offset from page
    const offset = (validPage - 1) * validLimit;
    return {
        skip: offset,
        take: validLimit,
        page: validPage,
        limit: validLimit
    };
}
/**
 * Create paginated response
 */
function createPaginatedResponse(data, total, page, limit) {
    const totalPages = Math.ceil(total / limit);
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
    };
}
/**
 * Add pagination headers to response
 */
function addPaginationHeaders(reply, page, limit, total) {
    const totalPages = Math.ceil(total / limit);
    reply.header('X-Pagination-Page', page.toString());
    reply.header('X-Pagination-Limit', limit.toString());
    reply.header('X-Pagination-Total', total.toString());
    reply.header('X-Pagination-Total-Pages', totalPages.toString());
    reply.header('X-Pagination-Has-Next', (page < totalPages).toString());
    reply.header('X-Pagination-Has-Prev', (page > 1).toString());
}
/**
 * Parse pagination from query string
 */
function parsePaginationFromQuery(query) {
    const validation = exports.paginationSchema.safeParse(query);
    if (validation.success) {
        return {
            page: validation.data.page,
            limit: validation.data.limit
        };
    }
    // Default pagination
    return {
        page: 1,
        limit: 20
    };
}
/**
 * Create cursor from item (typically ID or timestamp)
 */
function createCursor(value) {
    return Buffer.from(String(value)).toString('base64url');
}
/**
 * Decode cursor to original value
 */
function decodeCursor(cursor) {
    try {
        return Buffer.from(cursor, 'base64url').toString('utf-8');
    }
    catch {
        throw new Error('Invalid cursor');
    }
}
/**
 * Create cursor-based paginated response
 */
function createCursorPaginatedResponse(data, cursorField, limit, cursor) {
    const hasNext = data.length > limit;
    const items = hasNext ? data.slice(0, limit) : data;
    const lastItem = items.length > 0 ? items[items.length - 1] : null;
    const firstItem = items.length > 0 ? items[0] : null;
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
    };
}
/**
 * Parse sort from query string
 * Format: ?sort=field:asc or ?sort=field:desc
 */
function parseSortFromQuery(query, defaultField = 'createdAt', defaultDirection = 'desc') {
    const sortParam = query?.sort || query?.orderBy;
    if (!sortParam || typeof sortParam !== 'string') {
        return {
            field: defaultField,
            direction: defaultDirection
        };
    }
    const parts = sortParam.split(':');
    const field = parts[0] || defaultField;
    const direction = (parts[1]?.toLowerCase() === 'asc' ? 'asc' : 'desc');
    return {
        field,
        direction
    };
}
/**
 * Validate sort field against allowed fields
 */
function validateSortField(field, allowedFields) {
    return allowedFields.includes(field);
}
