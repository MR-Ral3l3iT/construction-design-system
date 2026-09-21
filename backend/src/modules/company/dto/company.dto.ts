import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
} from 'class-validator'

export class UpdateCompanyProfileDto {
  @ApiPropertyOptional({ example: 'บริษัท ฃวด จำกัด' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string

  @ApiPropertyOptional({ example: 'สำนักงานใหญ่' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  branchName?: string

  @ApiPropertyOptional({ example: '00000', description: '00000 = สำนักงานใหญ่' })
  @IsOptional()
  @IsNumberString()
  @Length(5, 5)
  branchCode?: string

  @ApiPropertyOptional({ example: '0105564177133', description: 'เลขประจำตัวผู้เสียภาษี 13 หลัก' })
  @IsOptional()
  @IsNumberString()
  @Length(13, 13)
  taxId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string

  @ApiPropertyOptional({ description: 'บรรทัดติดต่อที่พิมพ์บนหัวเอกสาร' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  contactLine?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoUrl?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  signatureUrl?: string

  @ApiPropertyOptional({ example: '( อธิป ชลสวัสดิ์ )' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  signatureName?: string

  @ApiPropertyOptional({ description: 'บริษัทจดทะเบียนภาษีมูลค่าเพิ่มหรือไม่' })
  @IsOptional()
  @IsBoolean()
  isVatRegistered?: boolean

  @ApiPropertyOptional({ example: 7, description: 'อัตรา VAT เป็นเปอร์เซ็นต์ (7 = 7%)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  defaultVatPercent?: number
}

export class CreateBankAccountDto {
  @ApiProperty({ example: 'กสิกร ออมทรัพย์หลัก', description: 'ชื่อย่อไว้เลือกใน dropdown' })
  @IsString()
  @MaxLength(100)
  name: string

  @ApiProperty({ example: 'ธนาคารกสิกรไทย' })
  @IsString()
  @MaxLength(100)
  bankName: string

  @ApiPropertyOptional({ example: 'สาขาเซ็นทรัลรัตนาธิเบศร์' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  branchName?: string

  @ApiPropertyOptional({ example: 'ออมทรัพย์' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  accountType?: string

  @ApiProperty({ example: 'บริษัท ฃวด จำกัด' })
  @IsString()
  @MaxLength(255)
  accountName: string

  @ApiProperty({ example: '124-8-42852-6' })
  @IsString()
  @MaxLength(50)
  accountNo: string

  @ApiPropertyOptional({
    description: 'ตั้งเป็นบัญชีหลัก — บัญชีอื่นจะถูกปลด default ให้อัตโนมัติ',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class UpdateBankAccountDto extends CreateBankAccountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  declare name: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  declare bankName: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  declare accountName: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  declare accountNo: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
