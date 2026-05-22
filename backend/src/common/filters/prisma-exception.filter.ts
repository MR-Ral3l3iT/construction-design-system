import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { Response } from 'express'

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name)

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'เกิดข้อผิดพลาดกับฐานข้อมูล'

    switch (exception.code) {
      case 'P2002': {
        statusCode = HttpStatus.CONFLICT
        const field = (exception.meta?.target as string[])?.join(', ') ?? 'field'
        message = `${field} นี้มีอยู่ในระบบแล้ว`
        break
      }
      case 'P2025':
        statusCode = HttpStatus.NOT_FOUND
        message = 'ไม่พบข้อมูลที่ต้องการ'
        break
      case 'P2003':
        statusCode = HttpStatus.BAD_REQUEST
        message = 'ข้อมูลที่อ้างอิงไม่พบในระบบ'
        break
      case 'P2014':
        statusCode = HttpStatus.BAD_REQUEST
        message = 'ไม่สามารถลบข้อมูลได้ เนื่องจากมีข้อมูลที่เกี่ยวข้อง'
        break
      default:
        this.logger.error(`Prisma error ${exception.code}`, exception.message)
    }

    response.status(statusCode).json({
      success: false,
      statusCode,
      message,
      error: exception.code,
      timestamp: new Date().toISOString(),
    })
  }
}
