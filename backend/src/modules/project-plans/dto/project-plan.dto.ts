import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator'
import { ConstructionTaskStatus } from '@prisma/client'

export class CreateProjectPlanDto {
  @IsInt()
  projectId: number

  @IsString()
  templateType: string
}

export class UpdateProjectPlanTaskDto {
  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsEnum(ConstructionTaskStatus)
  status?: ConstructionTaskStatus

  @IsOptional()
  @IsInt()
  progress?: number

  @IsOptional()
  @IsString()
  startDate?: string

  @IsOptional()
  @IsString()
  endDate?: string

  @IsOptional()
  @IsInt()
  sortOrder?: number
}

export class AddTaskDto {
  @IsString()
  title: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsString()
  startDate?: string

  @IsOptional()
  @IsString()
  endDate?: string

  @IsOptional()
  @IsInt()
  sortOrder?: number
}

// ─── Template Management DTOs ─────────────────────────────────────────────────

export class CreateTemplateDto {
  @IsString()
  name: string

  @IsString()
  type: string
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  name?: string
}

export class CreateTemplatePhaseDto {
  @IsString()
  name: string

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class UpdateTemplatePhaseDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class CreateTemplateTaskDto {
  @IsString()
  title: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  defaultDuration?: number

  @IsOptional()
  @IsBoolean()
  isOptional?: boolean

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class UpdateTemplateTaskDto {
  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsInt()
  @Min(0)
  defaultDuration?: number

  @IsOptional()
  @IsBoolean()
  isOptional?: boolean

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}
