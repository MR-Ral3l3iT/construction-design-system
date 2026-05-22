import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator'
import { Permissions } from '../../common/decorators/permissions.decorator'
import { CommentsService } from './comments.service'
import { CreateCommentDto } from './dto/create-comment.dto'
import { UpdateCommentDto } from './dto/update-comment.dto'
import { ListCommentDto } from './dto/list-comment.dto'

@ApiBearerAuth()
@ApiTags('Comments')
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @Permissions('comment.create')
  @ApiOperation({ summary: 'เพิ่ม comment' })
  create(@Body() dto: CreateCommentDto, @CurrentUser() user: RequestUser) {
    return this.commentsService.create(dto, user.id)
  }

  @Get()
  @Permissions('comment.view')
  @ApiOperation({ summary: 'รายการ comment ของ target' })
  findByTarget(@Query() dto: ListCommentDto) {
    return this.commentsService.findByTarget(dto)
  }

  @Patch(':id')
  @Permissions('comment.update')
  @ApiOperation({ summary: 'แก้ไข comment (เจ้าของเท่านั้น)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.commentsService.update(id, dto, user.id)
  }

  @Delete(':id')
  @Permissions('comment.delete')
  @ApiOperation({ summary: 'ลบ comment (เจ้าของหรือ Admin)' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    const isAdmin = user.roles?.includes('ADMIN') ?? false
    return this.commentsService.remove(id, user.id, isAdmin)
  }
}
