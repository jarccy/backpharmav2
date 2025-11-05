import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../access/services/users.service';
import { LoginDto } from './dto/login-dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userServices: UsersService,
    private readonly jwtService: JwtService,
  ) { }

  async loginUser(loginDto: LoginDto) {
    const user = await this.userServices.findOneByEmail(loginDto.email);

    if (!user) {
      throw new UnauthorizedException('Email not found');
    }

    const validPassword = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!validPassword) {
      throw new UnauthorizedException('Invalid password');
    }

    const payload = { id: user.id, email: user.email, role: user.roleId };
    const token = await this.jwtService.signAsync(payload);
    delete user.password;

    return {
      token,
      user,
    };
  }

  async logoutUser(id: number) {
    const user = await this.userServices.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    // await this.userServices.update(id, { token: null });
    return {
      message: 'Logout successful',
    };
  }

  async getUser(id: number) {
    const data = await this.userServices.getUser(id);
    if (!data) {
      throw new NotFoundException('User not found');
    }
    return data;
  }
}
