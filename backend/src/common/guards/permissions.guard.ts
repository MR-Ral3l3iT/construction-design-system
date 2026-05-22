import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator'
import { RequestUser } from '../decorators/current-user.decorator'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!required || required.length === 0) return true

    const request = context.switchToHttp().getRequest()
    const user: RequestUser = request.user
    if (!user) return false

    // ADMIN bypasses all permission checks
    if (user.roles.includes('ADMIN')) return true

    const hasAll = required.every((p) => user.permissions.includes(p))
    if (!hasAll) throw new ForbiddenException('ไม่มีสิทธิ์ดำเนินการนี้')
    return true
  }
}
