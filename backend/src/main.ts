import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import helmet from 'helmet'
import { AppModule } from './app.module'

async function bootstrap() {
  const logger = new Logger('Bootstrap')
  const app = await NestFactory.create(AppModule)
  const configService = app.get(ConfigService)

  // HTTP security headers
  app.use(helmet())

  // CORS
  const corsOrigins = configService.get<string>('CORS_ORIGINS', 'http://localhost:3000')
  app.enableCors({
    origin: corsOrigins.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  // Global API prefix
  app.setGlobalPrefix('api/v1')

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  )

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
