import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Put,
  Res,
  Query,
} from '@nestjs/common';
import { UsersService } from './services/users.service';
import { RolesService } from './services/roles.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { ActiveUser } from '../common/decorators/active-user.decorator';
import { UserActiveI } from 'src/common/interfaces/user-active.interface';
import { CreateRoleDto } from './dto/create-role.dto';
import { GetDTO } from './../common/dto/params-dto';
import { Response } from 'express';
import { PassUserDto } from './dto/pass-user.dto';

@UseGuards(AuthGuard)
@Controller('access')
export class AccessController {
  constructor(
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
  ) { }

  @Get('users')
  findAllUsers(@Query() dto: GetDTO) {
    return this.usersService.findAll(dto);
  }

  @Post('users')
  createUser(
    @ActiveUser() user: UserActiveI,
    @Body() createUserDto: CreateUserDto,
  ) {
    return this.usersService.create(createUserDto);
  }

  @Put('users/:id')
  updateUser(
    @ActiveUser() user: UserActiveI,
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Put('users/password/:id')
  updatePassword(
    @ActiveUser() user: UserActiveI,
    @Param('id') id: string,
    @Body() passUserDto: PassUserDto,
  ) {
    return this.usersService.updatePassword(+id, passUserDto);
  }

  @Get('users/roles')
  getRoles() {
    return this.rolesService.getRoles();
  }

  @Post('users/export')
  async exportUser(@Body() dto: GetDTO, @Res() res: Response) {
    const excelBuffer = await this.usersService.exportToExcel(dto);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="file.xlsx"');

    return res.end(excelBuffer);
  }

  @Get('roles')
  findAllRoles() {
    return this.rolesService.findAll();
  }

  @Post('roles')
  createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Put('roles/:id')
  updateRole(@Param('id') id: string, @Body() updateRoleDto: CreateRoleDto) {
    return this.rolesService.update(+id, updateRoleDto);
  }

  @Get('roles/permissions')
  getPermissions() {
    return this.rolesService.getPermissions();
  }
}
