import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsArray, IsEmail, IsInt, IsOptional, IsString, MinLength } from 'class-validator'

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  name: string

  @ApiProperty()
  @IsEmail({}, { message: 'รูปแบบอีเมลไม่ถูกต้อง' })
  email: string

  @ApiProperty()
  @IsString()
  @MinLength(8, { message: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร' })
  password: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional({ type: [Number], description: 'รายการ role ID' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  roleIds?: number[]
}
