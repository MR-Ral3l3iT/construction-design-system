import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ProjectType } from '@prisma/client'
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

export class CreateProjectDto {
  @ApiProperty({ example: 'บ้านพักอาศัย 2 ชั้น' })
  @IsString()
  @MaxLength(300)
  name: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ enum: ProjectType, example: ProjectType.DESIGN_ONLY })
  @IsEnum(ProjectType)
  type: ProjectType

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  customerId: number

  @ApiPropertyOptional({ example: '10000000.00' })
  @IsOptional()
  @IsDecimal()
  budgetMin?: string

  @ApiPropertyOptional({ example: '15000000.00' })
  @IsOptional()
  @IsDecimal()
  budgetMax?: string

  @ApiPropertyOptional({ example: '123 ถนนสุขุมวิท' })
  @IsOptional()
  @IsString()
  addressLine?: string

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

  @ApiPropertyOptional({ example: '13.7563' })
  @IsOptional()
  @IsDecimal()
  latitude?: string

  @ApiPropertyOptional({ example: '100.5018' })
  @IsOptional()
  @IsDecimal()
  longitude?: string

  @ApiPropertyOptional({ example: '250.00' })
  @IsOptional()
  @IsDecimal()
  areaSize?: string

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  designStartDate?: string

  @ApiPropertyOptional({ example: '2026-03-31' })
  @IsOptional()
  @IsDateString()
  designEndDate?: string
}
