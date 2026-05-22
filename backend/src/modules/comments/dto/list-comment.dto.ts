import { ApiProperty } from '@nestjs/swagger'
import { CommentTargetType } from '@prisma/client'
import { IsEnum, IsInt, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class ListCommentDto {
  @ApiProperty({ enum: CommentTargetType })
  @IsEnum(CommentTargetType)
  targetType: CommentTargetType

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  targetId: number
}
