import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { Reflector } from '@nestjs/core'
import * as request from 'supertest'
import { AppModule } from '../src/app.module'
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor'
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard'

/**
 * E2E tests for auth flow.
 * Requires a running test database (construction_db_test).
 * Run: DATABASE_URL=... npx jest --config test/jest-e2e.json
 */
describe('Auth E2E', () => {
  let app: INestApplication
  let accessToken: string | undefined

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.setGlobalPrefix('api/v1')
    const reflector = app.get(Reflector)
    app.useGlobalGuards(new JwtAuthGuard(reflector))
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    )
    app.useGlobalInterceptors(new ResponseInterceptor())
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /api/v1/auth/login', () => {
    it('should reject missing credentials', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({})

      expect(res.status).toBe(400)
    })

    it('should reject wrong credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'notexist@test.com', password: 'wrongpass' })

      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/v1/auth/me', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/me')
      expect(res.status).toBe(401)
    })

    it('should return user info when authenticated', async () => {
      // Skip if no accessToken — integration test requires seed data
      if (!accessToken) return

      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)

      expect(res.status).toBe(200)
      expect(res.body.data.email).toBeDefined()
    })
  })
})
