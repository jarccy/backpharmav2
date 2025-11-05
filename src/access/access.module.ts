import { Module } from '@nestjs/common';
import { UsersService } from './services/users.service';
import { AccessController } from './access.controller';
import { PrismaService } from '../prisma.service';
import { RolesService } from './services/roles.service';

@Module({
  controllers: [AccessController],
  providers: [RolesService, UsersService, PrismaService],
  exports: [UsersService],
})
export class AccessModule {}
