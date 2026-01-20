import { Module } from '@nestjs/common';
import { PeopleController } from './people.controller';
import { PrismaService } from '../../prisma.service';
import { PeopleService } from './people.service';
import { WhatsappGateway } from '../whatsapp/websockets/socket.gateaway';

@Module({
  controllers: [PeopleController],
  providers: [
    PeopleService,
    PrismaService,
    WhatsappGateway,
  ],
  exports: [],
})
export class PeopleModule { }
