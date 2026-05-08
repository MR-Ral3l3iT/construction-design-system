import { Module } from '@nestjs/common'
import { ConfigModule as NestConfigModule } from '@nestjs/config'
import * as Joi from 'joi'

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      // รองรับทั้ง local .env และ root .env ของ monorepo
      envFilePath: ['.env', '../.env'],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        BACKEND_PORT: Joi.number().default(3001),

        // Database
        DATABASE_URL: Joi.string().required(),

        // JWT
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRES_IN: Joi.string().default('15m'),
        JWT_REFRESH_SECRET: Joi.string().required(),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

        // CORS
        CORS_ORIGINS: Joi.string().default('http://localhost:3000'),

        // MinIO / Storage
        MINIO_ENDPOINT: Joi.string().default('localhost'),
        MINIO_PORT: Joi.number().default(9000),
        MINIO_ACCESS_KEY: Joi.string().required(),
        MINIO_SECRET_KEY: Joi.string().required(),
        MINIO_BUCKET: Joi.string().default('construction-files'),
        MINIO_USE_SSL: Joi.boolean().default(false),

        // Upload
        MAX_FILE_SIZE_MB: Joi.number().default(50),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
  ],
})
export class ConfigModule {}
