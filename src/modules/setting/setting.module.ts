import { Module } from '@nestjs/common';
import { SettingController } from './setting.controller';
import { PrismaService } from '../../prisma.service';
import { MaintenanceService } from './maintenance.service';

@Module({
  controllers: [SettingController],
  providers: [MaintenanceService, PrismaService],
})
export class SettingModule { }
