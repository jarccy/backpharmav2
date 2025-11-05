import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guard/auth.guard';
import { GetDTO } from '../common/dto/params-dto';
// import { Response } from 'express';
import { DataService } from './services/data.service';

@UseGuards(AuthGuard)
@Controller('data')
export class DataController {
  constructor(
    private readonly dataService: DataService,
  ) { }

  @Get('default/countries')
  findCountries() {
    return this.dataService.findCountries();
  }

  @Get('/all/maintenance')
  findMaintenance() {
    return this.dataService.getMaintenance();
  }

  @Get('/filter/department')
  findDepartment(@Query() dto: GetDTO) {
    return this.dataService.findDepartment(dto);
  }

  @Get('/filter/city')
  findCity(@Query() dto: GetDTO) {
    return this.dataService.findCity(dto);
  }

  @Get('/filter/entity')
  findEntity(@Query() dto: GetDTO) {
    return this.dataService.getEntity(dto);
  }

  @Get('/filter/pdv')
  findPdv(@Query() dto: GetDTO) {
    return this.dataService.getPdv(dto);
  }

  @Get('/filter/whatsapp')
  findWhatsapp() {
    return this.dataService.getWhatsapp();
  }
}
