import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Request, Response } from 'express'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  constructor(private readonly configService: ConfigService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()
    const isProd = this.configService.get('NODE_ENV') === 'production'

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR
    let message: string | string[] = 'เกิดข้อผิดพลาดภายในระบบ'
    let error = 'Internal Server Error'

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus()
      const res = exception.getResponse()
      if (typeof res === 'string') {
        message = res
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>
        message = (body.message as string | string[]) ?? message
        error = (body.error as string) ?? error
      }
    } else {
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : exception,
      )
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(isProd ? {} : { stack: exception instanceof Error ? exception.stack : undefined }),
    })
  }
}
