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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../../auth/guard/auth.guard';
import { GetDTO } from '../../common/dto/params-dto';
import { Response } from 'express';
import { PeopleService } from './people.service';
import { UpdatePeopleDto } from './dto/update-people.dto';
import { StorePeopleDto } from './dto/store-people.dto';
import { ActiveUser } from '../../common/decorators/active-user.decorator';
import { UserActiveI } from '../../common/interfaces/user-active.interface';

@UseGuards(AuthGuard)
@Controller('people')
export class PeopleController {
  constructor(
    private readonly peopleService: PeopleService,
  ) { }

  @Get('/')
  findAllPeople(@Query() dto: GetDTO) {
    return this.peopleService.findAll(dto);
  }

  @Get('/:id')
  findPeopleById(@Param('id') id: string) {
    return this.peopleService.getPeopleById(+id);
  }

  @Post('/')
  createPeople(@ActiveUser() user: UserActiveI, @Body() dto: StorePeopleDto) {
    return this.peopleService.createPeople(+user.id, dto);
  }

  @Put('/:id')
  updatePeople(
    @ActiveUser() user: UserActiveI,
    @Param('id') id: string,
    @Body() dto: UpdatePeopleDto,
  ) {
    return this.peopleService.updatePeople(+user.id, +id, dto);
  }

  @Post('/export')
  async exportPeople(@Body() dto: GetDTO, @Res() res: Response) {
    const excelBuffer = await this.peopleService.exportToExcel(dto);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="file.xlsx"');

    return res.end(excelBuffer);
  }

  @Get('/filter/all')
  findPeople(@Query() dto: GetDTO) {
    return this.peopleService.findPeople(dto);
  }

  @Get('/filter/select')
  findPeopleSelect(@Query() dto: GetDTO) {
    return this.peopleService.findPeopleSelect(dto);
  }

  //import people from excel
  @Post('/import/data')
  @UseInterceptors(FileInterceptor('file'))
  importPeople(
    @ActiveUser() user: UserActiveI,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.peopleService.importPeopleFromExcel(+user.id, file);
  }
}
