import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    UseGuards,
    Put,
    Query,
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { Whatsapp } from './dto/whatsapp.dto';
import { WhatsappService } from './services/whatsapp.service';
import { ContactService } from './services/contact.service';
import { MessageService } from './services/message.service';
import { TemplateService } from './services/template.service';
import { ActiveUser } from 'src/common/decorators/active-user.decorator';
import { UserActiveI } from 'src/common/interfaces/user-active.interface';
import { createTemplate } from './dto/templates.dto';
import { GetDTO } from '../common/dto/params-dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
// import { StoreMessage } from './dto/message.dto';

@UseGuards(AuthGuard)
@Controller('connection')
export class WhatsappController {
    constructor(
        private readonly whatsappService: WhatsappService,
        private readonly contactService: ContactService,
        private readonly messageService: MessageService,
        private readonly templateService: TemplateService,
    ) { }

    //WhatsApp
    @Get()
    async getWhatsapps() {
        return this.whatsappService.getWhatsapps();
    }

    @Get('/active')
    async whatsappList() {
        return this.whatsappService.whatsappList();
    }

    @Post()
    async createWhatsapp(@Body() data: Whatsapp) {
        return this.whatsappService.createWhatsapp(data);
    }

    @Put('/:id')
    async updateWhatsapp(
        @Param('id') id: number,
        @Body() data: Whatsapp,
    ) {
        return this.whatsappService.updateWhatsapp(+id, data);
    }

    @Post('/disconect/:id')
    async disconectWhatsapp(
        @Param('id') id: number,
    ) {
        return this.whatsappService.disconectWhatsapp(+id);
    }

    //Chats
    @Get('chats')
    async getChats(@Query() dto: GetDTO) {
        return this.messageService.getChats(dto);
    }

    @Get('chat/:id')
    async getChat(
        @Param('id') id: number
    ) {
        return this.messageService.getChatByContact(+id)
    }

    //Contacts
    @Get('contacts')
    async getContacts() {
        return this.contactService.getContacts();
    }

    //Templates
    @Get('templates')
    findAllTemplates(@Query() dto: GetDTO) {
        return this.templateService.getTemplates(dto);
    }

    @Post('templates')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (req, file, callback) => {
                    const dirPath = './public/templates';
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
    createTemplate(
        @UploadedFile() file: Express.Multer.File,
        @ActiveUser() user: UserActiveI,
        @Body() createTemplateDto: createTemplate,
    ) {
        let fileUrl = null;
        if (file) {
            fileUrl = `${process.env.BASE_URL}/public/templates/${file.filename}`;
        }

        return this.templateService.createTemplate(
            createTemplateDto,
            +user.id,
            fileUrl,
        );
    }

    @Put('templates/:id')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (req, file, callback) => {
                    const dirPath = './public/templates';
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
    updateTemplate(
        @UploadedFile() file: Express.Multer.File,
        @ActiveUser() user: UserActiveI,
        @Param('id') id: string,
        @Body() updateTemplateDto: createTemplate,
    ) {
        let fileUrl = null;
        if (file) {
            fileUrl = `${process.env.BASE_URL}/public/templates/${file.filename}`;
        }

        return this.templateService.updateTemplate(
            +id,
            updateTemplateDto,
            +user.id,
            fileUrl,
        );
    }

    @Post('templates/sync/all')
    @UseInterceptors(
        FileInterceptor('file', {
            storage: diskStorage({
                destination: (req, file, callback) => {
                    const dirPath = './public/templates';
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
    syncTemplates(
        @ActiveUser() user: UserActiveI,
        @Body() createTemplateDto: createTemplate,
    ) {
        return this.templateService.syncTemplates(
            createTemplateDto,
            +user.id,
            null,
        );
    }
}

