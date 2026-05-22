import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IssuePriority, IssueStatus } from '@prisma/client'
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'

export class CreateIssueDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  projectId: number

  @ApiProperty({ example: 'รอยแตกร้าวที่ผนัง' })
  @IsString()
  @MaxLength(300)
  title: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ enum: IssuePriority, default: IssuePriority.MEDIUM })
  @IsOptional()
  @IsEnum(IssuePriority)
  priority?: IssuePriority

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string
}

export class UpdateIssueDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional({ enum: IssuePriority })
  @IsOptional()
  @IsEnum(IssuePriority)
  priority?: IssuePriority

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string
}

export class UpdateIssueStatusDto {
  @ApiProperty({ enum: IssueStatus })
  @IsEnum(IssueStatus)
  status: IssueStatus
}
