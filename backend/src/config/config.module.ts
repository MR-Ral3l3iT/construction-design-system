import { Module } from '@nestjs/common'
import { ConfigModule as NestConfigModule } from '@nestjs/config'
import * as Joi from 'joi'

/**
 * secret ที่ใช้เซ็น JWT ต้องไม่ใช่ค่าตัวอย่างจาก .env.production.example
 * เพราะไฟล์นั้นอยู่ใน git ที่ใครก็อ่านได้ — ถ้า production เผลอใช้ค่านั้น
 * ใครก็ปลอม token เป็น admin ได้โดยไม่ต้องรู้รหัสผ่าน
 *
 * ยอมให้ start ไม่ขึ้นดีกว่าปล่อยให้รันทั้งที่ auth ถูก bypass ได้
 */
const jwtSecret = (label: string) =>
  Joi.string()
    .required()
    .min(32)
    .pattern(/CHANGE_ME/i, { invert: true })
    .messages({
      'string.min': `${label} ต้องยาวอย่างน้อย 32 ตัวอักษร — สร้างด้วย: openssl rand -base64 48`,
      'string.pattern.invert.base': `${label} ยังเป็นค่าตัวอย่างจาก .env.production.example ซึ่งเปิดเผยอยู่ใน git — ต้องสุ่มใหม่ก่อนใช้งานจริง`,
    })

/** export ไว้เพื่อให้ test ยิงตรงได้ว่ากฎแต่ละข้อทำงานจริง */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  BACKEND_PORT: Joi.number().default(3001),

  // Database
  DATABASE_URL: Joi.string().required(),

  // JWT
  JWT_SECRET: jwtSecret('JWT_SECRET'),
  JWT_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: jwtSecret('JWT_REFRESH_SECRET').invalid(Joi.ref('JWT_SECRET')).messages({
    'any.invalid': 'JWT_REFRESH_SECRET ต้องไม่ซ้ำกับ JWT_SECRET',
  }),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // CORS
  CORS_ORIGINS: Joi.string().default('http://localhost:3003'),

  // MinIO / Storage
  MINIO_ENDPOINT: Joi.string().default('localhost'),
  MINIO_PORT: Joi.number().default(9000),
  MINIO_ACCESS_KEY: Joi.string().required(),
  MINIO_SECRET_KEY: Joi.string().required(),
  MINIO_BUCKET: Joi.string().default('construction-files'),
  MINIO_USE_SSL: Joi.boolean().default(false),

  // Upload
  MAX_FILE_SIZE_MB: Joi.number().default(50),
})

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      // รองรับทั้ง local .env และ root .env ของ monorepo
      envFilePath: ['.env', '../.env'],
      validationSchema: envValidationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
  ],
})
export class ConfigModule {}
