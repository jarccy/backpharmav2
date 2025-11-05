import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { PrismaService } from '../prisma.service';
import { CalendarService } from './calendar.service';

@Module({
  controllers: [CalendarController],
  providers: [CalendarService, PrismaService],
  exports: [],
})
export class CalendarModule {}
