import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/guard/auth.guard';
import { GetDTO } from '../common/dto/params-dto';
import { Response } from 'express';
import { ActiveUser } from 'src/common/decorators/active-user.decorator';
import { UserActiveI } from 'src/common/interfaces/user-active.interface';
import { UpdateCompanyDto } from './dto/company/update-company.dto';
import { CompanyService } from './services/company.service';
import { StoreCompanyDto } from './dto/company/store-company.dto';

@UseGuards(AuthGuard)
@Controller('company')
export class CompanyController {
  constructor(
    private readonly companyService: CompanyService,
  ) { }

  @Get('/')
  findAllCompany(@Query() dto: GetDTO) {
    return this.companyService.findAll(dto);
  }

  @Get('/:id')
  findCompanyById(@Param('id') id: string) {
    return this.companyService.getCompanyById(+id);
  }

  @Post('/')
  createCompany(@ActiveUser() user: UserActiveI, @Body() dto: StoreCompanyDto) {
    return this.companyService.createCompany(+user.id, dto);
  }

  @Put('/:id')
  updateCompany(
    @ActiveUser() user: UserActiveI,
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.companyService.updateCompany(+user.id, +id, dto);
  }

  @Post('/export')
  async exportCompany(@Body() dto: GetDTO, @Res() res: Response) {
    const excelBuffer = await this.companyService.exportToExcel(dto);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="file.xlsx"');

    return res.end(excelBuffer);
  }
}
