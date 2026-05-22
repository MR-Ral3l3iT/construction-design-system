import { Module } from '@nestjs/common'
import { ActivityLogService } from '../../common/services/activity-log.service'
import { CommentsController } from './comments.controller'
import { CommentsService } from './comments.service'

@Module({
  controllers: [CommentsController],
  providers: [CommentsService, ActivityLogService],
  exports: [CommentsService],
})
export class CommentsModule {}
