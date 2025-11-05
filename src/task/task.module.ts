import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TaskService } from './task.service';
import { WhatsappGateway } from '../whatsapp/websockets/socket.gateaway';

@Module({
  controllers: [],
  providers: [TaskService, PrismaService, WhatsappGateway],
  exports: [],
})
export class TaskModule {}
