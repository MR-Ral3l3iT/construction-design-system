import { UserStatus } from './enums'
import { BaseEntity } from './common.types'

// ─── Role & Permission ────────────────────────────────────────────────────────

export interface Permission extends BaseEntity {
  key: string
  name: string
  group: string
  description: string | null
  isActive: boolean
}

export interface Role extends BaseEntity {
  name: string
  description: string | null
  isActive: boolean
  permissions?: Permission[]
}

// ─── User ─────────────────────────────────────────────────────────────────────

export interface User extends BaseEntity {
  name: string
  email: string
  phone: string | null
  avatar: string | null
  status: UserStatus
  roles?: Role[]
  deletedAt: string | null
}

export interface UserSummary {
  id: number
  name: string
  email: string
  avatar: string | null
  roleName?: string
}

// ─── JWT ──────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: number
  email: string
  roles: string[]
  iat?: number
  exp?: number
}

export interface AuthTokens {
  accessToken: string
  expiresIn: number
}

// ─── Auth Requests ────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: User
  accessToken: string
  expiresIn: number
}

export interface RefreshResponse {
  accessToken: string
  expiresIn: number
}

// ─── Role Name Constants ──────────────────────────────────────────────────────

export const ROLES = {
  ADMIN: 'ADMIN',
  SALE: 'SALE',
  DESIGNER: 'DESIGNER',
  ESTIMATOR: 'ESTIMATOR',
  PROJECT_MANAGER: 'PROJECT_MANAGER',
  SITE_ENGINEER: 'SITE_ENGINEER',
  ACCOUNTANT: 'ACCOUNTANT',
  CUSTOMER: 'CUSTOMER',
} as const

export type RoleName = (typeof ROLES)[keyof typeof ROLES]
