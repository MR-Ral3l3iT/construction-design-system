import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { AccountType } from '@prisma/client'
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator'

export class CreateChartOfAccountDto {
  @ApiProperty({ example: '5100' })
  @IsString()
  @MaxLength(20)
  code: string

  @ApiProperty({ example: 'ค่าวัสดุก่อสร้าง' })
  @IsString()
  @MaxLength(255)
  name: string

  @ApiProperty({ enum: AccountType, example: AccountType.EXPENSE })
  @IsEnum(AccountType)
  type: AccountType

  @ApiPropertyOptional({ description: 'บัญชีแม่ เช่น 5000 ต้นทุนงานก่อสร้าง' })
  @IsOptional()
  @IsInt()
  @Min(1)
  parentId?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class UpdateChartOfAccountDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string

  @ApiPropertyOptional({ enum: AccountType })
  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  parentId?: number | null

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class CreateWhtRateDto {
  @ApiProperty({ example: 'WHT3' })
  @IsString()
  @MaxLength(10)
  code: string

  @ApiProperty({ example: 3, description: 'อัตราเป็นเปอร์เซ็นต์ (3 = 3%)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  percent: number

  @ApiProperty({ example: 'ค่าจ้างทำของ / ค่าบริการ' })
  @IsString()
  @MaxLength(255)
  description: string

  @ApiPropertyOptional({ example: '40(7)(8)' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  section?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class UpdateWhtRateDto {
  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percent?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  section?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class CloseFiscalPeriodDto {
  @ApiProperty({ example: 2026 })
  @IsInt()
  @Min(2000)
  year: number

  @ApiProperty({ example: 9 })
  @IsInt()
  @Min(1)
  @Max(12)
  month: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}
