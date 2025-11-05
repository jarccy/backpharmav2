import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login-dto';
import { UserActiveI } from '../common/interfaces/user-active.interface';
import { ActiveUser } from '../common/decorators/active-user.decorator';
import { AuthGuard } from './guard/auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.loginUser(loginDto);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  logout(@ActiveUser() user: UserActiveI) {
    return this.authService.logoutUser(user.id);
  }

  @Get('user')
  @UseGuards(AuthGuard)
  user(@ActiveUser() user: UserActiveI) {
    return this.authService.getUser(user.id);
  }
}
