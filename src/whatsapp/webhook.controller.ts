import { AuthGuard } from '../auth/guard/auth.guard';
import { Body, Controller, Get, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { Request, Response } from 'express';
import { parseContact, parseMessage } from './functions';
import { MessageService } from './services/message.service';
import { ActiveUser } from '../common/decorators/active-user.decorator';
import { UserActiveI } from '../common/interfaces/user-active.interface';
import { SendMessage } from './dto/message.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';

@Controller('webhook')
export class WebhookController {

    constructor(private readonly messageService: MessageService) { }

    // Verificación inicial del webhook (Meta lo requiere)
    @Get()
    verify(@Req() req: Request, @Res() res: Response) {
        const VERIFY_TOKEN = '36g1isPvokmmHVSSRKT5ktqu8Qk_2zvUu8j3t3So2ogV5343X'; // el mismo que configures en Meta
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];
        console.log("verify", res.json());


        if (mode && token && mode === 'subscribe' && token === VERIFY_TOKEN) {
            return res.status(200).send(challenge);
        } else {
            return res.sendStatus(403);
        }
    }

    // Recepción de mensajes/eventos
    @Post()
    receive(@Req() req: Request, @Res() res: Response) {
        const body = req.body;

        // console.log('JSON', JSON.stringify(body, null, 2));

        const changes = body.entry[0].changes[0];
        const value = changes.value;

        // Mensajes entrantes
        if (Array.isArray(value?.messages)) {
            value.messages.forEach((message: any, index: number) => {
                const messageValues = parseMessage(message);
                const contactValues = parseContact(value?.contacts?.[index]);

                console.log('📩 Mensaje entrante:', messageValues);
                console.log('👤 Contacto entrante:', contactValues);

                let newMessage = {
                    messageId: messageValues.id,
                    timestamp: messageValues.timestamp,
                    mediaType: messageValues.type,
                    body: messageValues.text,
                    name: contactValues.name,
                    number: contactValues.number,
                    mediaId: messageValues.mediaId,
                }

                this.messageService.createMessage(newMessage);
            });
        }

        // Cambios de estado
        if (Array.isArray(value?.statuses)) {
            value.statuses.forEach((status: any, index: number) => {
                let newValues = {
                    messageId: status.id,
                    number: status.recipient_id,
                    timestamp: status.timestamp,
                    status: status.status,
                    isDelete: 0,
                }
                console.log(`📊 Estado de mensaje [${index}]:`, status);

                this.messageService.updateMessageStatus(newValues as any);
            });
        }

        // Actualización de plantilla
        if (changes?.field === 'message_template_status_update') {
            console.log('📝 Template updated:', value);
        }

        return res.sendStatus(200); // WhatsApp requiere 200 OK
    }


    // Envio de mensajes
    @UseGuards(AuthGuard)
    @Post('send')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (req, file, callback) => {
                    const dirPath = './public/messages';
                    if (!fs.existsSync(dirPath)) {
                        fs.mkdirSync(dirPath, { recursive: true });
                    }
                    callback(null, dirPath);
                },
                filename: (req, file, callback) => {
                    const uniqueSuffix =
                        Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const originalName = file.originalname.replace(/\s/g, '_');
                    callback(null, `${uniqueSuffix}-${originalName}`);
                },
            }),
        }),
    )
    async send(
        @UploadedFile() file: Express.Multer.File,
        @ActiveUser() user: UserActiveI,
        @Body() body: SendMessage,
        @Res() res: Response) {

        const response = await this.messageService.sendMessage(+user.id, body);
        console.log("Mensaje enviado:", response);


        return res.json(response);
        // return res.sendStatus(200); // WhatsApp requiere 200 OK
    }

    @UseGuards(AuthGuard)
    @Get('templates')
    async getTemplates() {
        const templates = await this.messageService.getTemplates();
        return templates;
    }

}
