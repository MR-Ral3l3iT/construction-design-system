import { NestFactory, Reflector } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import helmet from 'helmet'
import * as cookieParser from 'cookie-parser'
import { AppModule } from './app.module'
import { ResponseInterceptor } from './common/interceptors/response.interceptor'
import { GlobalExceptionFilter } from './common/filters/http-exception.filter'
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'

async function bootstrap() {
  const logger = new Logger('Bootstrap')
  const app = await NestFactory.create(AppModule)
  const configService = app.get(ConfigService)

  // HTTP security headers — allow cross-origin loading of images/files served by this API
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  )

  // Cookie parser (for httpOnly refresh token)
  app.use(cookieParser())

  // CORS
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:3003')
  app.enableCors({
    origin: corsOrigins.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  // Global API prefix
  app.setGlobalPrefix('api/v1')

  // Global JWT guard — ทุก endpoint ต้อง auth ยกเว้นที่ mark @Public()
  const reflector = app.get(Reflector)
  app.useGlobalGuards(new JwtAuthGuard(reflector))

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  // Global response interceptor + exception filters
  app.useGlobalInterceptors(new ResponseInterceptor())
  app.useGlobalFilters(new GlobalExceptionFilter(configService), new PrismaExceptionFilter())

  // Swagger API Docs (disabled in production)
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Construction Design System API')
      .setDescription('API สำหรับระบบบริหารงานออกแบบและก่อสร้าง')
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT')
      .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    })
    logger.log(`Swagger docs: http://localhost:${configService.get('BACKEND_PORT', 3001)}/api/docs`)
  }

  const port = configService.get<number>('BACKEND_PORT', 3001)
  await app.listen(port)
  logger.log(`Application running on: http://localhost:${port}/api/v1`)
}

bootstrap()
