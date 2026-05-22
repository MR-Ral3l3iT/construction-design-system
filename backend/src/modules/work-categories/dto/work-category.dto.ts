import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator'
import { Transform } from 'class-transformer'

export class CreateWorkCategoryDto {
  @IsString() name: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() color?: string
  @IsOptional() @IsInt() order?: number
}

export class UpdateWorkCategoryDto {
  @IsOptional() @IsString() name?: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsString() color?: string
  @IsOptional() @IsInt() order?: number
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean
}
