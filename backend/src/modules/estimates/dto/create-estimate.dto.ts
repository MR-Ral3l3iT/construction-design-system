import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsArray,
  IsDecimal,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

export class CreateEstimateItemDto {
  @ApiProperty({ example: 'งานรื้อถอน' })
  @IsString()
  @MaxLength(300)
  name: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ example: '1.000' })
  @IsOptional()
  @IsDecimal()
  quantity?: string

  @ApiPropertyOptional({ example: 'ชุด' })
  @IsOptional()
  @IsString()
  unit?: string

  @ApiProperty({ example: '50000.00' })
  @IsDecimal()
  unitPrice: string

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  subQuotationId?: number
}

export class CreateEstimateDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  projectId: number

  @ApiProperty({ example: 'ใบประเมินราคาครั้งที่ 1' })
  @IsString()
  @MaxLength(300)
  title: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ type: [CreateEstimateItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEstimateItemDto)
  items?: CreateEstimateItemDto[]
}
