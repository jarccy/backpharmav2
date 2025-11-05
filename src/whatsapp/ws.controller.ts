import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from 'src/auth/guard/auth.guard';
import { WhatsappService } from './websockets/whatsapp';
import { ActiveUser } from 'src/common/decorators/active-user.decorator';
import { UserActiveI } from 'src/common/interfaces/user-active.interface';
import { StoreManyMessage, StoreMessage } from './dto/message.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as fs from 'fs';

@UseGuards(AuthGuard)
@Controller('ws')
export class WSController {
  constructor(private readonly wsService: WhatsappService) { }

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
    const response = await this.wsService.sendWSMessage(
      body,
      +user.id,
      fileUrl,
    );
    return response;
  }

  @Post('send-many-message')
  async sendManyMessage(
    @ActiveUser() user: UserActiveI,
    @Body() body: StoreManyMessage,
  ) {
    try {
      await this.wsService.sendManyMessage(body, +user.id);
      return { status: 200, message: 'Success' };
    } catch (error) {
      return { status: 400, message: 'Error' };
    }
  }

  @Post('disconnect')
  async disconnectWS() {
    try {
      await this.wsService.closeClient();
      return true;
    } catch (error) {
      return { status: 400, message: 'Error' };
    }
  }
}
