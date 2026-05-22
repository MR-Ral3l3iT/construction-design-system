import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { RequestUser } from '../decorators/current-user.decorator'

@Injectable()
export class CustomerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user: RequestUser = request.user
    if (!user) return false

    // Admin can access client routes too (for testing / support)
    if (user.roles.includes('ADMIN')) return true

    if (!user.roles.includes('CUSTOMER')) {
      throw new ForbiddenException('เฉพาะผู้ใช้งาน Customer เท่านั้น')
    }
    if (!user.customerId) {
      throw new ForbiddenException('บัญชีนี้ยังไม่ได้ผูกกับลูกค้า')
    }
    return true
  }
}
