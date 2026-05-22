import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerModule } from '@nestjs/throttler'
import { ConfigModule } from './config/config.module'
import { PrismaModule } from './database/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { ApprovalsModule } from './modules/approvals/approvals.module'
import { BOQModule } from './modules/boq/boq.module'
import { QuotationModule } from './modules/quotation/quotation.module'
import { SubQuotationModule } from './modules/sub-quotation/sub-quotation.module'
import { ChangeRequestsModule } from './modules/change-requests/change-requests.module'
import { CommentsModule } from './modules/comments/comments.module'
import { ProjectPlansModule } from './modules/project-plans/project-plans.module'
import { ContractsModule } from './modules/contracts/contracts.module'
import { CronModule } from './modules/cron/cron.module'
import { CustomersModule } from './modules/customers/customers.module'
import { DailyUpdatesModule } from './modules/daily-updates/daily-updates.module'
import { DashboardModule } from './modules/dashboard/dashboard.module'
import { DesignTasksModule } from './modules/design-tasks/design-tasks.module'
import { EstimatesModule } from './modules/estimates/estimates.module'
import { IssuesModule } from './modules/issues/issues.module'
import { PaymentsModule } from './modules/payments/payments.module'
import { PermissionsModule } from './modules/permissions/permissions.module'
import { ProjectsModule } from './modules/projects/projects.module'
import { RolesModule } from './modules/roles/roles.module'
import { StorageModule } from './modules/storage/storage.module'
import { UsersModule } from './modules/users/users.module'
import { ClientModule } from './modules/client/client.module'
import { SiteModule } from './modules/site/site.module'
import { WorkCategoriesModule } from './modules/work-categories/work-categories.module'
import { DailyReportsModule } from './modules/daily-reports/daily-reports.module'
import { HealthModule } from './modules/health/health.module'
import { MailModule } from './modules/mail/mail.module'

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    // Core
    AuthModule,
    RolesModule,
    PermissionsModule,
    UsersModule,
    // Phase 4 — Business Modules
    CustomersModule,
    ProjectsModule,
    EstimatesModule,
    DesignTasksModule,
    BOQModule,
    QuotationModule,
    SubQuotationModule,
    ContractsModule,
    PaymentsModule,
    ProjectPlansModule,
    DailyUpdatesModule,
    IssuesModule,
    ChangeRequestsModule,
    StorageModule,
    DashboardModule,
    // Phase 4 — Cross-cutting
    CommentsModule,
    ApprovalsModule,
    CronModule,
    // Phase 7 — Client Portal
    ClientModule,
    // Phase 8 — Site Portal
    SiteModule,
    // Phase 9 — Daily Reports
    WorkCategoriesModule,
    DailyReportsModule,
    HealthModule,
    MailModule,
  ],
})
export class AppModule {}
