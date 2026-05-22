// ─── User ─────────────────────────────────────────────────────────────────────
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

// ─── Customer / Lead ──────────────────────────────────────────────────────────
export enum CustomerType {
  INDIVIDUAL = 'INDIVIDUAL',
  COMPANY = 'COMPANY',
}

export enum LeadStatus {
  INTERESTED = 'INTERESTED',
  SITE_VISIT = 'SITE_VISIT',
  QUOTED = 'QUOTED',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST',
}

// ─── Project ──────────────────────────────────────────────────────────────────
export enum ProjectType {
  DESIGN_ONLY = 'DESIGN_ONLY',
  TURNKEY = 'TURNKEY',
}

export enum ProjectStatus {
  LEAD = 'LEAD',
  ESTIMATING = 'ESTIMATING',
  DESIGNING = 'DESIGNING',
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  BOQ = 'BOQ',
  CONTRACT = 'CONTRACT',
  CONSTRUCTION = 'CONSTRUCTION',
  HANDOVER = 'HANDOVER',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// ─── Estimate ─────────────────────────────────────────────────────────────────
export enum EstimateStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// ─── Design ───────────────────────────────────────────────────────────────────
export enum DesignTaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_REVIEW = 'WAITING_REVIEW',
  REVISION = 'REVISION',
  APPROVED = 'APPROVED',
  CANCELLED = 'CANCELLED',
}

// ─── BOQ ──────────────────────────────────────────────────────────────────────
export enum BOQStatus {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  APPROVED = 'APPROVED',
  LOCKED = 'LOCKED',
}

// ─── Contract / Payment ───────────────────────────────────────────────────────
export enum ContractStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

// ─── Construction ─────────────────────────────────────────────────────────────
export enum ConstructionTaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  BLOCKED = 'BLOCKED',
  COMPLETED = 'COMPLETED',
}

export enum DailyUpdateStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

// ─── Issue / Change Request ───────────────────────────────────────────────────
export enum IssueStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum IssuePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum ChangeRequestStatus {
  REQUESTED = 'REQUESTED',
  ESTIMATING = 'ESTIMATING',
  WAITING_APPROVAL = 'WAITING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
}

// ─── File / Comment / Approval ────────────────────────────────────────────────
export enum FileCategory {
  DESIGN = 'DESIGN',
  BOQ = 'BOQ',
  CONTRACT = 'CONTRACT',
  DAILY_UPDATE = 'DAILY_UPDATE',
  ISSUE = 'ISSUE',
  PAYMENT = 'PAYMENT',
  HANDOVER = 'HANDOVER',
  OTHER = 'OTHER',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum CommentTargetType {
  PROJECT = 'PROJECT',
  DESIGN_TASK = 'DESIGN_TASK',
  DAILY_UPDATE = 'DAILY_UPDATE',
  ISSUE = 'ISSUE',
  CHANGE_REQUEST = 'CHANGE_REQUEST',
  BOQ = 'BOQ',
  PAYMENT = 'PAYMENT',
}
