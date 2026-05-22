import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator'

export class CreateDailyUpdateDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  projectId: number

  @ApiProperty({ example: '2026-04-01' })
  @IsDateString()
  updateDate: string

  @ApiPropertyOptional({ example: 'งานหล่อเสา ชั้น 2' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string

  @ApiProperty({ example: 'ทำการหล่อเสาคอนกรีตชั้น 2 เสร็จ 6 ต้น' })
  @IsString()
  workDone: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextPlan?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  problem?: string

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number
}

export class UpdateDailyUpdateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  workDone?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nextPlan?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  problem?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number
}
