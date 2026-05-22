import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { CustomerType, LeadStatus } from '@prisma/client'
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator'

export class CreateCustomerDto {
  @ApiProperty({ enum: CustomerType, example: CustomerType.INDIVIDUAL })
  @IsEnum(CustomerType)
  type: CustomerType

  @ApiProperty({ example: 'สมชาย มีทรัพย์' })
  @IsString()
  @MaxLength(200)
  name: string

  @ApiPropertyOptional({ example: 'บริษัท ตัวอย่าง จำกัด' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  companyName?: string

  @ApiPropertyOptional({
    example: '0105562123456',
    description: 'เลขประจำตัวผู้เสียภาษี 13 หลัก (เฉพาะนิติบุคคล)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(13)
  taxId?: string

  @ApiPropertyOptional({ example: 'somchai@example.com' })
  @IsOptional()
  @IsEmail({}, { message: 'รูปแบบอีเมลไม่ถูกต้อง' })
  email?: string

  @ApiPropertyOptional({ example: '0812345678' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lineId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  province?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  district?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subdistrict?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postcode?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string

  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  leadStatus?: LeadStatus

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string
}
