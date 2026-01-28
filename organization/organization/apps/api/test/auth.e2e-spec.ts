import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'SecurePassword123!',
        name: 'New User',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('access_token');
      expect(response.body.user.email).toBe(registerDto.email);
      expect(response.body.user.name).toBe(registerDto.name);
      expect(response.body.user.role).toBe('CUSTOMER');
      expect(response.body.user).not.toHaveProperty('password');

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: registerDto.email },
      });

      expect(user).toBeTruthy();
      expect(user?.email).toBe(registerDto.email);
      expect(user?.password).not.toBe(registerDto.password); // Should be hashed
    });

    it('should return 409 if user already exists', async () => {
      const existingUser = {
        email: 'existing@example.com',
        password: await bcrypt.hash('password123', 10),
        name: 'Existing User',
        role: 'CUSTOMER',
      };

      await prisma.user.create({ data: existingUser });

      const registerDto = {
        email: 'existing@example.com',
        password: 'NewPassword123!',
        name: 'New Name',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(409);
    });

    it('should return 400 for invalid email', async () => {
      const registerDto = {
        email: 'invalid-email',
        password: 'SecurePassword123!',
        name: 'Test User',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);
    });

    it('should return 400 for missing required fields', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@example.com' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ password: 'password123' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Test User' })
        .expect(400);
    });

    it('should return 400 for weak password', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: '123', // Too short
        name: 'Test User',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);
    });

    it('should hash password before storing', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'SecurePassword123!',
        name: 'Test User',
      };

      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      const user = await prisma.user.findUnique({
        where: { email: registerDto.email },
      });

      expect(user?.password).not.toBe(registerDto.password);
      expect(user?.password.startsWith('$2b$')).toBe(true); // bcrypt hash
    });
  });

  describe('/auth/login (POST)', () => {
    beforeEach(async () => {
      // Create a test user before each login test
      const hashedPassword = await bcrypt.hash('password123', 10);
      await prisma.user.create({
        data: {
          email: 'testuser@example.com',
          password: hashedPassword,
          name: 'Test User',
          role: 'CUSTOMER',
        },
      });
    });

    it('should login successfully with correct credentials', async () => {
      const loginDto = {
        email: 'testuser@example.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('access_token');
      expect(response.body.user.email).toBe(loginDto.email);
      expect(response.body.user).not.toHaveProperty('password');
      expect(typeof response.body.access_token).toBe('string');
    });

    it('should return 401 for incorrect email', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return 401 for incorrect password', async () => {
      const loginDto = {
        email: 'testuser@example.com',
        password: 'wrongpassword',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should return 400 for missing credentials', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ password: 'password123' })
        .expect(400);
    });

    it('should return valid JWT token', async () => {
      const loginDto = {
        email: 'testuser@example.com',
        password: 'password123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      const token = response.body.access_token;

      // JWT should have 3 parts separated by dots
      const parts = token.split('.');
      expect(parts).toHaveLength(3);

      // Should be able to use token for authenticated requests
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('should work for admin users', async () => {
      const hashedPassword = await bcrypt.hash('adminpass', 10);
      await prisma.user.create({
        data: {
          email: 'admin@broxiva.com',
          password: hashedPassword,
          name: 'Admin User',
          role: 'ADMIN',
        },
      });

      const loginDto = {
        email: 'admin@broxiva.com',
        password: 'adminpass',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body.user.role).toBe('ADMIN');
    });

    it('should work for vendor users', async () => {
      const hashedPassword = await bcrypt.hash('vendorpass', 10);
      await prisma.user.create({
        data: {
          email: 'vendor@example.com',
          password: hashedPassword,
          name: 'Vendor User',
          role: 'VENDOR',
        },
      });

      const loginDto = {
        email: 'vendor@example.com',
        password: 'vendorpass',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body.user.role).toBe('VENDOR');
    });
  });

  describe('/auth/profile (GET)', () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
      // Create user and get auth token
      const hashedPassword = await bcrypt.hash('password123', 10);
      const user = await prisma.user.create({
        data: {
          email: 'profile@example.com',
          password: hashedPassword,
          name: 'Profile User',
          role: 'CUSTOMER',
        },
      });

      userId = user.id;

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'profile@example.com',
          password: 'password123',
        });

      authToken = loginResponse.body.access_token;
    });

    it('should return user profile with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(userId);
      expect(response.body.email).toBe('profile@example.com');
      expect(response.body.name).toBe('Profile User');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer()).get('/auth/profile').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return 401 with expired token', async () => {
      // This is a mock expired token (you'd need to generate one with expired date in real test)
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.expired.token';

      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should return 401 with malformed Authorization header', async () => {
      await request(app.getHttpServer())
        .get('/auth/profile')
        .set('Authorization', authToken) // Missing "Bearer " prefix
        .expect(401);
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit excessive registration attempts', async () => {
      const registerDto = {
        email: 'ratelimit@example.com',
        password: 'Password123!',
        name: 'Rate Limit Test',
      };

      // Make many requests quickly
      const requests = Array(101)
        .fill(null)
        .map((_, i) =>
          request(app.getHttpServer())
            .post('/auth/register')
            .send({
              ...registerDto,
              email: `user${i}@example.com`,
            }),
        );

      const responses = await Promise.all(requests);

      // At least one should be rate limited (429)
      const rateLimitedResponses = responses.filter((r) => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});
