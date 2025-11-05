import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Put,
  Query,
} from '@nestjs/common';
import { MaintenanceService } from './services/maintenance.service';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { ActiveUser } from '../common/decorators/active-user.decorator';
import { UserActiveI } from 'src/common/interfaces/user-active.interface';
import { CreateParentDto } from './dto/create-parent.dto';
import { CreateChildDto } from './dto/create-child.dto';
import { GetDTO } from '../common/dto/params-dto';

@UseGuards(AuthGuard)
@Controller('setting')
export class SettingController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get('maintenance/child')
  findAllChilds(@Query() dto: GetDTO) {
    return this.maintenanceService.findAllChilds(dto);
  }

  @Post('maintenance/child')
  createChild(@Body() dto: CreateChildDto) {
    return this.maintenanceService.createChild(dto);
  }

  @Put('maintenance/child/:id')
  updateChild(@Param('id') id: string, @Body() dto: CreateChildDto) {
    return this.maintenanceService.updateChild(+id, dto);
  }

  @Get('maintenance/parent')
  findAllParents() {
    return this.maintenanceService.findAllParents();
  }

  @Post('maintenance/parent')
  createParent(@Body() dto: CreateParentDto) {
    return this.maintenanceService.createParent(dto);
  }

  @Put('maintenance/parent/:id')
  updateParent(@Param('id') id: string, @Body() dto: CreateParentDto) {
    return this.maintenanceService.updateParent(+id, dto);
  }
}
