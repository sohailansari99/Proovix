require('dotenv').config({ path: '.env.test' });
const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../../src/app');
const User = require('../../src/modules/users/user.model');

let mongod;

describe('Auth Tests', () => {
  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('Registration', () => {
    test('should register a candidate successfully', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'test@gmail.com',
        password: 'Password123!'
      });
      expect(res.status).toBe(201);
      expect(res.body.data.email).toBe('test@gmail.com');
    });

    test('should reject object-shaped inputs on registration', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: { '$ne': null },
        password: 'Password123!'
      });
      expect(res.status).toBe(400);
    });

    test('should reject weak passwords', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'weak@gmail.com',
        password: 'weak'
      });
      expect(res.status).toBe(400);
    });
  });

  describe('Login', () => {
    test('should reject object-shaped inputs on login', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: { '$ne': null },
        password: 'Password123!'
      });
      expect(res.status).toBe(400);
    });
  });
});
