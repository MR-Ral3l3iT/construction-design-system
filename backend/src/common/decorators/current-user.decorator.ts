import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export interface RequestUser {
  id: number
  email: string
  roles: string[]
  permissions: string[]
  customerId?: number
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestUser => {
    const request = ctx.switchToHttp().getRequest()
    return request.user
  },
)
