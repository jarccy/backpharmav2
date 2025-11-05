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
import { ConnectionService } from './services/connection.service';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { Whatsapp } from './dto/whatsapp.dto';
import { MessageService } from './services/message.service';
import { ContactService } from './services/contact.service';
import { ActiveUser } from 'src/common/decorators/active-user.decorator';
import { UserActiveI } from 'src/common/interfaces/user-active.interface';
import { Template } from './dto/templates.dto';
import { GetDTO } from '../common/dto/params-dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';
import { StoreMessage } from './dto/message.dto';

@UseGuards(AuthGuard)
@Controller('connection')
export class WhatsappController {
  constructor(
    private readonly connectionService: ConnectionService,
    private readonly messageService: MessageService,
    private readonly contactService: ContactService,
  ) { }

  //Connections WhatsApp
  @Get()
  async getWhatsapps() {
    return this.connectionService.getWhatsapps();
  }

  @Get('/active')
  async whatsappList() {
    return this.connectionService.whatsappList();
  }

  @Post()
  async registerWhatsapp(@Body() data: Whatsapp) {
    return this.connectionService.createWhatsapp(data);
  }

  @Put('/:id')
  async updateWhatsapp(
    @Param('id') id: number,
    @Body() data: Whatsapp,
  ) {
    return this.connectionService.updateWhatsapp(+id, data);
  }

  @Post('/disconect/:id')
  async disconectWhatsapp(
    @Param('id') id: number,
  ) {
    return this.connectionService.disconectWhatsapp(+id);
  }

  //Send Message via WS
  @Post('send-message')
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
  async sendMessage(
    @UploadedFile() file: Express.Multer.File,
    @ActiveUser() user: UserActiveI,
    @Body() body: StoreMessage,
  ) {
    let fileUrl = null;
    if (file) {
      fileUrl = `${process.env.BASE_URL}/public/messages/${file.filename}`;
    }
    const response = await this.connectionService.sendWSMessage(
      body, +user.id, fileUrl);
    return response;
  }


  //Messages
  @Get('messages')
  async getChats(@Query() dto: GetDTO) {
    return this.messageService.getChats(dto);
  }

  @Get('messages/:id')
  async getChatByContact(
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
    return this.connectionService.getTemplates(dto);
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
    @Body() createTemplateDto: Template,
  ) {
    let fileUrl = null;
    if (file) {
      fileUrl = `${process.env.BASE_URL}/public/templates/${file.filename}`;
    }

    return this.connectionService.createTemplate(
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
    @Body() updateTemplateDto: Template,
  ) {
    let fileUrl = null;
    if (file) {
      fileUrl = `${process.env.BASE_URL}/public/templates/${file.filename}`;
    }

    return this.connectionService.updateTemplate(
      +id,
      updateTemplateDto,
      +user.id,
      fileUrl,
    );
  }

  @Get('templates/type')
  findAllTemplatesType(@Query() dto: GetDTO) {
    return this.connectionService.getTemplatesType(dto);
  }
}

