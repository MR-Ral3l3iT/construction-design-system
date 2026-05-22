import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ContractStatus } from '@prisma/client'
import {
  IsDateString,
  IsDecimal,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator'

export class CreateContractDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  projectId: number

  @ApiProperty({ example: 'สัญญาก่อสร้างบ้านพักอาศัย' })
  @IsString()
  @MaxLength(300)
  title: string

  @ApiPropertyOptional({ example: '15000000.00' })
  @IsOptional()
  @IsDecimal()
  totalAmount?: string

  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsOptional()
  @IsDateString()
  contractDate?: string

  @ApiPropertyOptional({ example: '2026-03-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string

  @ApiPropertyOptional({ example: '2027-03-01' })
  @IsOptional()
  @IsDateString()
  endDate?: string
}

export class UpdateContractDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal()
  totalAmount?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  contractDate?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string
}

export class UpdateContractStatusDto {
  @ApiProperty({ enum: ContractStatus })
  @IsEnum(ContractStatus)
  status: ContractStatus
}
