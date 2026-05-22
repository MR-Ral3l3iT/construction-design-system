import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator'
import { Permissions } from '../../common/decorators/permissions.decorator'
import { PaginationDto } from '../../common/dto/pagination.dto'
import { CreateContractDto, UpdateContractDto, UpdateContractStatusDto } from './dto/contract.dto'
import { ContractsService } from './contracts.service'

@ApiBearerAuth()
@ApiTags('Contracts')
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  @Permissions('contract.create')
  @ApiOperation({ summary: 'สร้างสัญญา' })
  create(@Body() dto: CreateContractDto, @CurrentUser() user: RequestUser) {
    return this.contractsService.create(dto, user.id)
  }

  @Get('project/:projectId')
  @Permissions('contract.view')
  @ApiOperation({ summary: 'รายการสัญญาของโครงการ' })
  findAllByProject(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.contractsService.findAllByProject(projectId, pagination)
  }

  @Get(':id')
  @Permissions('contract.view')
  @ApiOperation({ summary: 'ดูรายละเอียดสัญญา' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.contractsService.findOne(id)
  }

  @Patch(':id')
  @Permissions('contract.update')
  @ApiOperation({ summary: 'แก้ไขสัญญา (DRAFT เท่านั้น)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContractDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.contractsService.update(id, dto, user.id)
  }

  @Patch(':id/status')
  @Permissions('contract.update')
  @ApiOperation({ summary: 'เปลี่ยนสถานะสัญญา' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateContractStatusDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.contractsService.updateStatus(id, dto, user.id)
  }
}
