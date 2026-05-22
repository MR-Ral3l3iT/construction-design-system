import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { CommentTargetType } from '@prisma/client'
import { IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator'
import { Type } from 'class-transformer'

export class CreateCommentDto {
  @ApiProperty({ enum: CommentTargetType })
  @IsEnum(CommentTargetType)
  targetType: CommentTargetType

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetId: number

  @ApiProperty()
  @IsString()
  @MinLength(1)
  message: string

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  projectId?: number
}
