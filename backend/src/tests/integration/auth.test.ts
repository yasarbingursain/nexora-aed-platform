import request from 'supertest';
import { app } from '../../server';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';

describe('Authentication API Integration Tests', () => {
  let server: any;
  
  beforeAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: { contains: 'test' } }
    });
    await prisma.organization.deleteMany({
      where: { name: { contains: 'Test' } }
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: { email: { contains: 'test' } }
    });
    await prisma.organization.deleteMany({
      where: { name: { contains: 'Test' } }
    });
    
    // Close connections
    await prisma.$disconnect();
    await redis.quit();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new organization and admin user', async () => {
      const registerData = {
        organizationName: 'Test Organization',
        adminEmail: 'admin@test.com',
        adminPassword: 'SecurePassword123!',
        adminFirstName: 'Test',
        adminLastName: 'Admin'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(201);

      expect(response.body).toHaveProperty('message', 'Organization and admin user created successfully');
      expect(response.body).toHaveProperty('organizationId');
      expect(response.body).toHaveProperty('userId');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should reject registration with invalid email', async () => {
      const registerData = {
        organizationName: 'Test Organization 2',
        adminEmail: 'invalid-email',
        adminPassword: 'SecurePassword123!',
        adminFirstName: 'Test',
        adminLastName: 'Admin'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject registration with weak password', async () => {
      const registerData = {
        organizationName: 'Test Organization 3',
        adminEmail: 'admin3@test.com',
        adminPassword: 'weak',
        adminFirstName: 'Test',
        adminLastName: 'Admin'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject duplicate organization registration', async () => {
      const registerData = {
        organizationName: 'Test Organization',
        adminEmail: 'admin2@test.com',
        adminPassword: 'SecurePassword123!',
        adminFirstName: 'Test',
        adminLastName: 'Admin'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(registerData)
        .expect(409);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        email: 'admin@test.com',
        password: 'SecurePassword123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'admin@test.com');
    });

    it('should reject login with invalid credentials', async () => {
      const loginData = {
        email: 'admin@test.com',
        password: 'WrongPassword123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject login with non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@test.com',
        password: 'SecurePassword123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;

    beforeAll(async () => {
      // Get refresh token from login
      const loginData = {
        email: 'admin@test.com',
        password: 'SecurePassword123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      refreshToken = response.body.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
    });

    it('should reject refresh with invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    let accessToken: string;

    beforeAll(async () => {
      // Get access token from login
      const loginData = {
        email: 'admin@test.com',
        password: 'SecurePassword123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      accessToken = response.body.accessToken;
    });

    it('should get user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('email', 'admin@test.com');
      expect(response.body.user).toHaveProperty('role', 'admin');
    });

    it('should reject profile request without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should reject profile request with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let accessToken: string;

    beforeAll(async () => {
      // Get access token from login
      const loginData = {
        email: 'admin@test.com',
        password: 'SecurePassword123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send(loginData);

      accessToken = response.body.accessToken;
    });

    it('should logout successfully with valid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Logged out successfully');
    });

    it('should reject logout without token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on authentication endpoints', async () => {
      const loginData = {
        email: 'admin@test.com',
        password: 'WrongPassword123!'
      };

      // Make multiple failed login attempts
      const promises = Array(10).fill(null).map(() =>
        request(app)
          .post('/api/v1/auth/login')
          .send(loginData)
      );

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
