import { Module } from '@nestjs/common';
import { SettingController } from './setting.controller';
import { PrismaService } from '../prisma.service';
import { MaintenanceService } from './services/maintenance.service';

@Module({
  controllers: [SettingController],
  providers: [MaintenanceService, PrismaService],
})
export class SettingModule {}
