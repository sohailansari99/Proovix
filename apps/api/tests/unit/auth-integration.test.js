const app = require('../../src/app');
const request = require('supertest');

// Mock JWT token generator for testing
jest.mock('../../src/core/utils/jwt', () => ({
  generateToken: jest.fn(() => 'mock-jwt-token')
}));

describe('Auth Controller (HTTP layer)', () => {
  describe('Registration endpoint validation', () => {
    test('should reject missing email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ password: 'Password123!' });
      expect(res.status).toBe(400);
    });

    test('should reject missing password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'test@gmail.com' });
      expect(res.status).toBe(400);
    });

    test('should reject non-string email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: { '$ne': null }, password: 'Password123!' });
      // Should fail at validation before hitting DB
      expect(res.status).toBe(400);
    });

    test('should reject non-string password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'test@gmail.com', password: { '$ne': null } });
      expect(res.status).toBe(400);
    });

    test('should reject weak password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'test@gmail.com', password: 'weak' });
      expect(res.status).toBe(400);
    });

    test('should reject non-Gmail email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'test@yahoo.com', password: 'Password123!' });
      expect(res.status).toBe(400);
    });
  });

  describe('Login endpoint validation', () => {
    test('should reject missing email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ password: 'Password123!' });
      expect(res.status).toBe(400);
    });

    test('should reject missing password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'test@gmail.com' });
      expect(res.status).toBe(400);
    });

    test('should reject object-shaped email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: { '$ne': null }, password: 'Password123!' });
      expect(res.status).toBe(400);
    });
  });
});
