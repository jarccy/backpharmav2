import { Module } from '@nestjs/common';
import { Branchontroller } from './branch.controller';
import { PrismaService } from '../prisma.service';
import { BranchService } from './services/branch.service';

@Module({
  controllers: [Branchontroller],
  providers: [BranchService, PrismaService],
  exports: [],
})
export class BranchModule { }
