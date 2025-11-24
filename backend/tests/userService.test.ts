/**
 * User Service Tests
 * Unit tests for user management operations
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import { createUser, authenticateUser, findUserById, findUserByEmail, updateUser } from '../src/services/userService'
import { User } from '../src/models/User'

describe('User Service', () => {
  let testUser: User

  beforeEach(async () => {
    // Create a test user for each test
    testUser = await createUser({
      email: `test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
      displayName: 'Test User'
    })
  })

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const user = await createUser({
        email: 'newuser@example.com',
        password: 'Password123!',
        displayName: 'New User'
      })

      expect(user).toHaveProperty('id')
      expect(user.email).toBe('newuser@example.com')
      expect(user.displayName).toBe('New User')
      expect(user.passwordHash).toBeDefined()
      expect(user.vaultSalt).toBeDefined()
      expect(user.subscriptionTier).toBe('free')
      expect(user.subscriptionStatus).toBe('active')
      expect(user.emailVerified).toBe(false)
      expect(user.twoFactorEnabled).toBe(false)
    })

    it('should normalize email to lowercase', async () => {
      const user = await createUser({
        email: 'TEST@EXAMPLE.COM',
        password: 'Password123!'
      })

      expect(user.email).toBe('test@example.com')
    })

    it('should generate display name from email if not provided', async () => {
      const user = await createUser({
        email: 'user@example.com',
        password: 'Password123!'
      })

      expect(user.displayName).toBe('user')
    })

    it('should generate unique user IDs', async () => {
      const user1 = await createUser({
        email: 'user1@example.com',
        password: 'Password123!'
      })
      const user2 = await createUser({
        email: 'user2@example.com',
        password: 'Password123!'
      })

      expect(user1.id).not.toBe(user2.id)
    })

    it('should hash password with Argon2id', async () => {
      const user = await createUser({
        email: 'hashtest@example.com',
        password: 'Password123!'
      })

      expect(user.passwordHash).not.toBe('Password123!')
      expect(user.passwordHash.length).toBeGreaterThan(50) // Argon2 hashes are long
    })

    it('should generate vault salt', async () => {
      const user = await createUser({
        email: 'salttest@example.com',
        password: 'Password123!'
      })

      expect(user.vaultSalt).toBeDefined()
      expect(user.vaultSalt.length).toBeGreaterThan(0)
    })
  })

  describe('authenticateUser', () => {
    it('should authenticate user with correct credentials', async () => {
      const user = await createUser({
        email: 'auth@example.com',
        password: 'CorrectPassword123!'
      })

      const authenticated = await authenticateUser('auth@example.com', 'CorrectPassword123!')

      expect(authenticated).not.toBeNull()
      expect(authenticated?.id).toBe(user.id)
      expect(authenticated?.email).toBe('auth@example.com')
    })

    it('should reject incorrect password', async () => {
      await createUser({
        email: 'wrongpass@example.com',
        password: 'CorrectPassword123!'
      })

      const authenticated = await authenticateUser('wrongpass@example.com', 'WrongPassword123!')

      expect(authenticated).toBeNull()
    })

    it('should reject non-existent user', async () => {
      const authenticated = await authenticateUser('nonexistent@example.com', 'Password123!')

      expect(authenticated).toBeNull()
    })

    it('should normalize email for authentication', async () => {
      await createUser({
        email: 'normalize@example.com',
        password: 'Password123!'
      })

      const authenticated = await authenticateUser('NORMALIZE@EXAMPLE.COM', 'Password123!')

      expect(authenticated).not.toBeNull()
    })
  })

  describe('findUserById', () => {
    it('should find user by ID', async () => {
      const found = await findUserById(testUser.id)

      expect(found).not.toBeNull()
      expect(found?.id).toBe(testUser.id)
      expect(found?.email).toBe(testUser.email)
    })

    it('should return null for non-existent user', async () => {
      const found = await findUserById('non-existent-id')

      expect(found).toBeNull()
    })
  })

  describe('findUserByEmail', () => {
    it('should find user by email', async () => {
      const found = await findUserByEmail(testUser.email)

      expect(found).not.toBeNull()
      expect(found?.id).toBe(testUser.id)
      expect(found?.email).toBe(testUser.email)
    })

    it('should normalize email for lookup', async () => {
      const found = await findUserByEmail(testUser.email.toUpperCase())

      expect(found).not.toBeNull()
      expect(found?.id).toBe(testUser.id)
    })

    it('should return null for non-existent email', async () => {
      const found = await findUserByEmail('nonexistent@example.com')

      expect(found).toBeNull()
    })
  })

  describe('updateUser', () => {
    it('should update user display name', async () => {
      const updated = await updateUser(testUser.id, {
        displayName: 'Updated Name'
      })

      expect(updated).not.toBeNull()
      expect(updated?.displayName).toBe('Updated Name')
    })

    it('should update user email', async () => {
      const newEmail = `updated-${Date.now()}@example.com`
      const updated = await updateUser(testUser.id, {
        email: newEmail
      })

      expect(updated).not.toBeNull()
      expect(updated?.email).toBe(newEmail.toLowerCase())
    })

    it('should update subscription tier', async () => {
      const updated = await updateUser(testUser.id, {
        subscriptionTier: 'individual',
        subscriptionStatus: 'active'
      })

      expect(updated).not.toBeNull()
      expect(updated?.subscriptionTier).toBe('individual')
      expect(updated?.subscriptionStatus).toBe('active')
    })

    it('should return null for non-existent user', async () => {
      const updated = await updateUser('non-existent-id', {
        displayName: 'Test'
      })

      expect(updated).toBeNull()
    })
  })
})

