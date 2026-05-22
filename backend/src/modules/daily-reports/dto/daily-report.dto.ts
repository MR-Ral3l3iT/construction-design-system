import { Type } from 'class-transformer'
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'
import {
  DailyReportItemStatus,
  ReportImageType,
  ReportIssueSeverity,
  ReportIssueStatus,
  WeatherCondition,
} from '@prisma/client'

// ─── Item ────────────────────────────────────────────────────────────────────

export class CreateReportItemDto {
  @IsInt() categoryId: number
  @IsString() description: string
  @IsOptional() @IsNumber() @Min(0) @Max(100) progress?: number
  @IsOptional() @IsString() unit?: string
  @IsOptional() @IsNumber() quantity?: number
  @IsOptional() @IsEnum(DailyReportItemStatus) status?: DailyReportItemStatus
  @IsOptional() @IsInt() sortOrder?: number
}

export class UpdateReportItemDto {
  @IsOptional() @IsInt() categoryId?: number
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsNumber() @Min(0) @Max(100) progress?: number
  @IsOptional() @IsString() unit?: string
  @IsOptional() @IsNumber() quantity?: number
  @IsOptional() @IsEnum(DailyReportItemStatus) status?: DailyReportItemStatus
  @IsOptional() @IsInt() sortOrder?: number
}

// ─── Issue ───────────────────────────────────────────────────────────────────

export class CreateReportIssueDto {
  @IsString() issue: string
  @IsOptional() @IsString() impact?: string
  @IsOptional() @IsString() solution?: string
  @IsOptional() @IsEnum(ReportIssueSeverity) severity?: ReportIssueSeverity
}

export class UpdateReportIssueDto {
  @IsOptional() @IsString() issue?: string
  @IsOptional() @IsString() impact?: string
  @IsOptional() @IsString() solution?: string
  @IsOptional() @IsEnum(ReportIssueSeverity) severity?: ReportIssueSeverity
  @IsOptional() @IsEnum(ReportIssueStatus) status?: ReportIssueStatus
}

// ─── Report ──────────────────────────────────────────────────────────────────

export class CreateDailyReportDto {
  @IsInt() projectId: number
  @IsString() reportDate: string // ISO date string
  @IsOptional() @IsEnum(WeatherCondition) weather?: WeatherCondition
  @IsOptional() @IsNumber() @Min(0) @Max(100) overallProgress?: number
  @IsOptional() @IsString() nextPlan?: string
  @IsOptional() @IsString() issueSummary?: string

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReportItemDto)
  items?: CreateReportItemDto[]

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateReportIssueDto)
  issues?: CreateReportIssueDto[]
}

export class UpdateDailyReportDto {
  @IsOptional() @IsString() reportDate?: string
  @IsOptional() @IsEnum(WeatherCondition) weather?: WeatherCondition
  @IsOptional() @IsNumber() @Min(0) @Max(100) overallProgress?: number
  @IsOptional() @IsString() nextPlan?: string
  @IsOptional() @IsString() issueSummary?: string
}

export class QueryDailyReportDto {
  @IsOptional() @IsString() projectId?: string
  @IsOptional() @IsString() month?: string // YYYY-MM
  @IsOptional() @IsString() status?: string
}
