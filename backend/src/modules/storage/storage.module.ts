import { Module } from '@nestjs/common'
import { MulterModule } from '@nestjs/platform-express'
import { StorageController } from './storage.controller'
import { StorageService } from './storage.service'

@Module({
  imports: [
    MulterModule.register({
      storage: undefined, // use memory storage (buffer)
    }),
  ],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
