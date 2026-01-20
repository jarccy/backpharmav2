import { Module } from '@nestjs/common';
import { WhatsappGateway } from './websockets/socket.gateaway';
import { PrismaService } from '../../prisma.service';
import { WhatsappController, } from './whatsapp.controller';
import { WebhookController } from './webhook.controller';
import { WhatsappService } from './services/whatsapp.service';
import { ContactService } from './services/contact.service';
import { MessageService } from './services/message.service';
import { TemplateService } from './services/template.service';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { HttpModule } from '@nestjs/axios';
import { TaskWhatsappService } from './services/taskWhatsapp.service';
import { ChartService } from './services/chart.service';
import { ChartController } from './chart.controller';

@Module({
    imports: [
        HttpModule,
        MulterModule.register({
            storage: diskStorage({
                destination: './uploads',
            }),
        }),
    ],
    controllers: [WhatsappController, WebhookController, ChartController],
    providers: [
        WhatsappGateway,
        PrismaService,
        WhatsappService,
        ContactService,
        MessageService,
        TemplateService,
        TaskWhatsappService,
        ChartService,
    ],
})
export class WhatsappModule { }
