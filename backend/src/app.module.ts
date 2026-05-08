import { Module } from '@nestjs/common'
import { ConfigModule } from './config/config.module'
import { PrismaModule } from './database/prisma.module'

@Module({
  imports: [ConfigModule, PrismaModule],
})
export class AppModule {}
