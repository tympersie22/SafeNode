/**
 * Type declarations for @jest/globals
 * This file provides type definitions for Jest globals when using @jest/globals
 */

declare module '@jest/globals' {
  export const describe: typeof global.describe
  export const it: typeof global.it
  export const test: typeof global.test
  export const expect: typeof global.expect
  export const beforeAll: typeof global.beforeAll
  export const afterAll: typeof global.afterAll
  export const beforeEach: typeof global.beforeEach
  export const afterEach: typeof global.afterEach
  export const vi: any
}

