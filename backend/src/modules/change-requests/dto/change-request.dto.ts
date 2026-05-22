import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ChangeRequestStatus } from '@prisma/client'
import { IsDecimal, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class CreateChangeRequestDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  projectId: number

  @ApiProperty({ example: 'เพิ่มห้องน้ำชั้น 3' })
  @IsString()
  @MaxLength(300)
  title: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string

  @ApiPropertyOptional({ example: '500000.00' })
  @IsOptional()
  @IsDecimal()
  estimatedAmount?: string
}

export class UpdateChangeRequestDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal()
  estimatedAmount?: string
}

export class ApproveChangeRequestDto {
  @ApiProperty({ example: '450000.00' })
  @IsDecimal()
  approvedAmount: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string
}

export class UpdateChangeRequestStatusDto {
  @ApiProperty({ enum: ChangeRequestStatus })
  @IsEnum(ChangeRequestStatus)
  status: ChangeRequestStatus
}
