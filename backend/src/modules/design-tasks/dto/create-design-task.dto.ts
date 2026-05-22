import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { DesignTaskStatus } from '@prisma/client'
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class CreateDesignTaskDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  projectId: number

  @ApiProperty({ example: 'แบบสถาปัตยกรรม' })
  @IsString()
  @MaxLength(300)
  title: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ example: '2026-01-15' })
  @IsOptional()
  @IsDateString()
  startDate?: string

  @ApiPropertyOptional({ example: '2026-02-15' })
  @IsOptional()
  @IsDateString()
  dueDate?: string
}

export class UpdateDesignTaskStatusDto {
  @ApiProperty({ enum: DesignTaskStatus })
  @IsEnum(DesignTaskStatus)
  status: DesignTaskStatus

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string
}
