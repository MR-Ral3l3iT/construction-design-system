import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import {
  IsArray,
  IsDecimal,
  IsInt,
  IsOptional,
  IsString,
  Max,
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

export class EstimateInstallmentDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  installmentNo: number

  @ApiProperty({ example: 'ค่าออกแบบงวดที่ 1' })
  @IsString()
  @MaxLength(300)
  description: string

  @ApiPropertyOptional({ description: '"หลังจาก ..."', example: 'ส่งมอบแบบร่าง' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  triggerText?: string | null

  @ApiPropertyOptional({ description: '"ภายใน x สัปดาห์"', example: 2 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(520)
  withinWeeks?: number | null

  @ApiProperty({ example: '30' })
  @IsDecimal()
  percentage: string

  @ApiProperty({ example: '15000.00' })
  @IsDecimal()
  amount: string
}

export class UpsertInstallmentsDto {
  @ApiProperty({ type: [EstimateInstallmentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EstimateInstallmentDto)
  installments: EstimateInstallmentDto[]
}

export class EstimateSchedulePhaseDto {
  @ApiProperty({ example: 'ออกแบบร่าง' })
  @IsString()
  @MaxLength(300)
  name: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string | null

  @ApiProperty({ description: 'สัปดาห์ที่เริ่ม (เริ่มที่ 1)', example: 1 })
  @IsInt()
  @Min(1)
  @Max(520)
  startWeek: number

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  @Max(520)
  durationWeeks: number
}

export class UpsertScheduleDto {
  @ApiProperty({ type: [EstimateSchedulePhaseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EstimateSchedulePhaseDto)
  phases: EstimateSchedulePhaseDto[]
}
