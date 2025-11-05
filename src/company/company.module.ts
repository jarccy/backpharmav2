import { Module } from '@nestjs/common';
import { CompanyController } from './company.controller';
import { PrismaService } from '../prisma.service';
import { CompanyService } from './services/company.service';

@Module({
  controllers: [CompanyController],
  providers: [CompanyService, PrismaService],
  exports: [],
})
export class CompanyModule { }
