import { Module } from '@nestjs/common';
import { PeopleController } from './people.controller';
import { PrismaService } from '../../prisma.service';
import { PeopleService } from './people.service';

@Module({
  controllers: [PeopleController],
  providers: [
    PeopleService,
    PrismaService,
  ],
  exports: [],
})
export class PeopleModule { }
