import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { BOQStatus } from '@prisma/client'
import {
  IsArray,
  IsDecimal,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'

export class CreateBOQItemDto {
  @ApiProperty()
  @IsString()
  @MaxLength(300)
  name: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remark?: string

  @ApiPropertyOptional({ default: '1.000' })
  @IsOptional()
  @IsDecimal()
  quantity?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string

  @ApiPropertyOptional({ example: '0.00' })
  @IsOptional()
  @IsDecimal()
  materialPrice?: string

  @ApiPropertyOptional({ example: '0.00' })
  @IsOptional()
  @IsDecimal()
  laborPrice?: string

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class CreateBOQSubCategoryDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name: string

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class UpdateBOQSubCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string
}

export class CreateBOQCategoryDto {
  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name: string

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class CreateBOQDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  projectId: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  designTaskId?: number

  @ApiProperty({ example: 'BOQ งานก่อสร้าง' })
  @IsString()
  @MaxLength(300)
  title: string

  @ApiPropertyOptional({ default: '0.00' })
  @IsOptional()
  @IsDecimal()
  overheadCost?: string

  @ApiPropertyOptional({ default: '0.00' })
  @IsOptional()
  @IsDecimal()
  profit?: string

  @ApiPropertyOptional({ type: [CreateBOQCategoryDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBOQCategoryDto)
  categories?: CreateBOQCategoryDto[]
}

export class UpdateBOQCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string
}

export class UpdateBOQDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal()
  overheadCost?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal()
  profit?: string
}

export class UpdateBOQItemDto extends CreateBOQItemDto {}

export class UpdateBOQStatusDto {
  @ApiProperty({ enum: BOQStatus })
  @IsEnum(BOQStatus)
  status: BOQStatus
}
