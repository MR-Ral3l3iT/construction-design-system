import { ApiProperty } from '@nestjs/swagger'
import { IsArray, IsString } from 'class-validator'

export class UpdateRolePermissionsDto {
  @ApiProperty({ type: [String], description: 'รายการ permission key ที่ต้องการตั้งให้ role' })
  @IsArray()
  @IsString({ each: true })
  permissionKeys: string[]
}
