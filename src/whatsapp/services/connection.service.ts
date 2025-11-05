import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Whatsapp } from '../dto/whatsapp.dto';
import { GetDTO } from '../../common/dto/params-dto';
import { Template } from '../dto/templates.dto';
import { diskStorage, StorageEngine } from 'multer';
import { initWbot } from '../example/wsessions';
import { WhatsappGateway } from '../websockets/socket.gateaway';
import { convertFileToBase64 } from 'src/common/functions';
import { MessageMedia } from 'whatsapp-web.js';
import { StoreMessage } from '../dto/message.dto';
import { removeWbot, getWbot } from '../example/wsessions';


@Injectable()
export class ConnectionService {
  constructor(private prisma: PrismaService, private readonly whatsappGateway: WhatsappGateway) { }

  //Connections WhatsApp
  async getWhatsapps() {
    return this.prisma.whatsapps.findMany();
  }

  async whatsappList() {
    const response = await this.prisma.whatsapps.findMany({
      select: {
        id: true,
        status: true,
        name: true
      }
    });

    const result = response.map((whatsapp) => ({
      value: whatsapp.id,
      label: whatsapp.name,
      status: whatsapp.status,
      style: {
        color: whatsapp.status === 'Conectado' ? 'green' : 'red'
      }
    }));

    return result;
  }

  async createWhatsapp(data: Whatsapp) {
    const wsId = await this.prisma.whatsapps.create({
      data: { ...data, status: 'Desconectado' },
    });

    initWbot(wsId, this.whatsappGateway);

    return 'Whatsapp registrado exitosamente';
  }

  async updateWhatsapp(id: number, data: Whatsapp,) {
    const existingWhatsapp = await this.prisma.whatsapps.findFirst()

    if (existingWhatsapp) {
      await this.prisma.whatsapps.update({
        where: { id },
        data,
      });
    }

    return 'Whatsapp actualizado exitosamente';
  }

  async updateStatusWhatsapp(id: number, status: string) {
    await this.prisma.whatsapps.update({
      where: { id },
      data: { status },
    });
    return 'Estado actualizado exitosamente';
  }

  async disconectWhatsapp(id: number) {
    await this.updateStatusWhatsapp(id, 'Desconectado');
    removeWbot(id);

    return 'Whatsapp desconectado exitosamente';
  }

  //Messages
  async sendWSMessage(
    data: StoreMessage,
    user: number,
    file: string,
  ): Promise<string> {
    try {
      let fileBase = null;
      let options: { media?: any } = {};
      const wbot = getWbot(1);

      if (file) {
        let fileUrl = file.split('/public')[1];
        fileBase = convertFileToBase64(fileUrl);
        options.media = new MessageMedia('image/jpeg', fileBase, 'archivo.jpg');
      }

      const numberId = await wbot.getNumberId(`${data.number}`);

      if (!numberId || !numberId._serialized) {
        return 'error';
      }

      await wbot.sendMessage(`${numberId._serialized}`, data.message, options);

      await this.prisma.messages.create({
        data: {
          body: data.message,
          ack: 0,
          read: 0,
          mediaType: data.mediaType,
          fromMe: 1,
          peopleId: parseInt(data.peopleId.toString()),
          mediaUrl: file ?? null,
          whatsappId: 1,
        },
      });
      return 'success';
    } catch (error) {
      console.error('Error al enviar el mensaje:', error);
      return 'error';
    }
  }

  //Templates
  async getTemplates(dto: GetDTO) {
    const { search } = dto;

    const data = await this.prisma.templates.findMany({
      select: {
        id: true,
        name: true,
        message: true,
        type: true,
        contentType: true,
        file: true,
        createdAt: true,
        updatedAt: true,
      },
      where: search
        ? {
          OR: [
            {
              name: {
                contains: search,
              },
            },
            {
              message: {
                contains: search,
              },
            },
          ],
        }
        : {},
    });

    return data;
  }

  async createTemplate(data: Template, user: number, url: string) {
    await this.prisma.templates.create({
      data: {
        ...data,
        userId: user,
        contentType: parseInt(data.contentType),
        type: parseInt(data.type),
        file: url,
      },
    });
    return 'Plantilla registrado exitosamente';
  }

  async updateTemplate(id: number, data: Template, user: number, url: string) {
    await this.prisma.templates.update({
      where: { id },
      data: {
        ...data,
        userId: user,
        contentType: parseInt(data.contentType),
        type: parseInt(data.type),
        file: url ?? undefined,
      },
    });

    return 'Plantilla actualizado exitosamente';
  }

  getStorageEngine(destinationPath: string): StorageEngine {
    return diskStorage({
      destination: destinationPath,
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const originalName = file.originalname.replace(/\s/g, '_');
        callback(null, `${uniqueSuffix}-${originalName}`);
      },
    });
  }

  async getTemplatesType(dto: GetDTO) {
    const { search } = dto;

    const data = await this.prisma.templates.findMany({
      select: {
        id: true,
        name: true,
      },
      where: search
        ? {
          type: {
            equals: parseInt(search),
          },
        }
        : {},
    });

    return data.map((template) => ({
      value: template.id,
      label: template.name,
    }));
  }
}
