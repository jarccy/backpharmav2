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
import { AuthGuard } from '../../auth/guard/auth.guard';
import { GetDTO } from '../../common/dto/params-dto';
import { Response } from 'express';
import { ActiveUser } from 'src/common/decorators/active-user.decorator';
import { UserActiveI } from 'src/common/interfaces/user-active.interface';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { BranchService } from './branch.service';
import { StoreBranchDto } from './dto/store-branch.dto';

@UseGuards(AuthGuard)
@Controller('branch')
export class Branchontroller {
  constructor(
    private readonly branchService: BranchService,
  ) { }

  @Get('/')
  findAllBranch(@Query() dto: GetDTO) {
    return this.branchService.findAll(dto);
  }

  @Get('/:id')
  findBranchById(@Param('id') id: string) {
    return this.branchService.getBranchById(+id);
  }

  @Post('/')
  createBranch(@ActiveUser() user: UserActiveI, @Body() dto: StoreBranchDto) {
    return this.branchService.createBranch(+user.id, dto);
  }

  @Put('/:id')
  updateBranch(
    @ActiveUser() user: UserActiveI,
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchService.updateBranch(+user.id, +id, dto);
  }

  @Post('/export')
  async exportBranch(@Body() dto: GetDTO, @Res() res: Response) {
    const excelBuffer = await this.branchService.exportToExcel(dto);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="file.xlsx"');

    return res.end(excelBuffer);
  }
}
