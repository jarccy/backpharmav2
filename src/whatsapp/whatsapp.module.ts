import { Module } from '@nestjs/common';
import { WhatsappGateway } from './websockets/socket.gateaway';
import { PrismaService } from '../prisma.service';
import { WhatsappService } from './websockets/whatsapp';
import { WhatsappController, } from './whatsapp.controller';
import { ConnectionService } from './services/connection.service';
import { ContactService } from './services/contact.service';
import { MessageService } from './services/message.service';
import { WSController } from './ws.controller';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { TaskWhatsappService } from './services/taskWhatsapp.service';
import { WsStartService } from './websockets/start';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
      }),
    }),
  ],
  controllers: [WhatsappController, WSController,],
  providers: [
    WhatsappGateway,
    WhatsappService,
    PrismaService,
    ConnectionService,
    ContactService,
    MessageService,
    TaskWhatsappService,
    WsStartService
  ],
})
export class WhatsappModule { }
