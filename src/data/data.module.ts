import { Module } from '@nestjs/common';
import { DataController } from './data.controller';
import { PrismaService } from '../prisma.service';
import { DataService } from './services/data.service';

@Module({
  controllers: [DataController],
  providers: [PrismaService, DataService],
  exports: [],
})
export class DataModule { }
