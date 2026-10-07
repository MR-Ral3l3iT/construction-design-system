import { envValidationSchema } from './config.module'

/**
 * กฎเรื่อง JWT secret เกิดจากเหตุจริง: .env.production ของ production
 * เคยใช้ค่าตัวอย่างจาก .env.production.example ซึ่ง commit อยู่ใน repo สาธารณะ
 * ทำให้ใครก็ปลอม token เป็น admin ได้ เทสชุดนี้กันไม่ให้ย้อนกลับไปเป็นแบบนั้นอีก
 */
const baseEnv = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  MINIO_ACCESS_KEY: 'key',
  MINIO_SECRET_KEY: 'secret',
  JWT_SECRET: 'a'.repeat(64),
  JWT_REFRESH_SECRET: 'b'.repeat(64),
}

const validate = (overrides: Record<string, unknown> = {}) =>
  envValidationSchema.validate(
    { ...baseEnv, ...overrides },
    { allowUnknown: true, abortEarly: false },
  )

describe('envValidationSchema — JWT secret', () => {
  it('ผ่านเมื่อ secret สุ่มมาและยาวพอ', () => {
    expect(validate().error).toBeUndefined()
  })

  it('ปฏิเสธค่าตัวอย่าง CHANGE_ME ที่เปิดเผยอยู่ใน git', () => {
    const { error } = validate({ JWT_SECRET: 'CHANGE_ME_AT_LEAST_64_CHARS_RANDOM_STRING' })
    expect(error).toBeDefined()
    expect(error!.message).toContain('ยังเป็นค่าตัวอย่าง')
  })

  it('ปฏิเสธ CHANGE_ME ของ refresh token ด้วย', () => {
    const { error } = validate({ JWT_REFRESH_SECRET: 'CHANGE_ME_DIFFERENT_64_CHARS_RANDOM_STRING' })
    expect(error).toBeDefined()
    expect(error!.message).toContain('ยังเป็นค่าตัวอย่าง')
  })

  it('จับได้แม้พิมพ์เป็นตัวพิมพ์เล็ก', () => {
    expect(
      validate({ JWT_SECRET: 'change_me_please_make_this_much_longer_ok' }).error,
    ).toBeDefined()
  })

  it('ปฏิเสธ secret ที่สั้นกว่า 32 ตัวอักษร', () => {
    const { error } = validate({ JWT_SECRET: 'short' })
    expect(error).toBeDefined()
    expect(error!.message).toContain('อย่างน้อย 32')
  })

  it('ปฏิเสธเมื่อ refresh secret ซ้ำกับ access secret', () => {
    const same = 'c'.repeat(64)
    const { error } = validate({ JWT_SECRET: same, JWT_REFRESH_SECRET: same })
    expect(error).toBeDefined()
    expect(error!.message).toContain('ต้องไม่ซ้ำ')
  })

  it('ปฏิเสธเมื่อไม่ได้ตั้ง secret เลย', () => {
    const { JWT_SECRET: _omit, ...rest } = baseEnv
    const { error } = envValidationSchema.validate(rest, { allowUnknown: true, abortEarly: false })
    expect(error).toBeDefined()
  })

  it('ยังบังคับ DATABASE_URL เหมือนเดิม', () => {
    const { DATABASE_URL: _omit, ...rest } = baseEnv
    expect(envValidationSchema.validate(rest, { allowUnknown: true }).error).toBeDefined()
  })
})
