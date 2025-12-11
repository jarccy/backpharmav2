import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SendMessage, StoreMessage, detailTemplate } from '../dto/message.dto';
import { GetDTO } from '../../common/dto/params-dto';
import { Prisma } from '@prisma/client';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MessageService {
  private readonly url = process.env.URL;
  private readonly token = process.env.WHATSAPP_TOKEN;
  private readonly urlTemplates = process.env.URT;

  constructor(private prisma: PrismaService, private httpService: HttpService) { }

  async getChats(dto: GetDTO) {
    const { search, perPage, page, whatsappId } = dto;
    // -- c.NOMBRE AS name, c.CELULAR AS number, c.profilePicUrl

    const query = Prisma.sql`
      SELECT m.id, m.body, m.read, m.mediaType, m.fromMe, m.createdAt, m.peopleId AS peopleId,
            c.NOMBRE AS name, c.CELULAR AS number
      FROM messages m
      INNER JOIN (
        SELECT peopleId AS peopleId, MAX(createdAt) AS latest
        FROM messages
        GROUP BY peopleId
      ) latest_msg ON m.peopleId = latest_msg.peopleId AND m.createdAt = latest_msg.latest
      INNER JOIN persona c ON c.ID_PERSONAL = m.peopleId
      ${search ? Prisma.sql`
        WHERE c.NOMBRE LIKE ${`%${search}%`} OR c.CELULAR LIKE ${`%${search}%`}
      ` : Prisma.empty}
      ORDER BY m.createdAt DESC
      LIMIT ${parseInt(perPage)} OFFSET ${(parseInt(page) - 1) * parseInt(perPage)};
    `;

    const serializedData = await this.prisma.$queryRaw<
      Array<{
        id: number;
        body: string;
        read: boolean;
        mediaType: string;
        fromMe: boolean;
        createdAt: Date;
        peopleId: number;
        name: string;
        number: string;
        profilePicUrl?: string;
      }>
    >(query);

    const data = serializedData.map((item) => ({
      peopleId: Number(item.peopleId),
      name: item.name,
      number: item.number,
      mediaType: item.mediaType,
      profilePicUrl: null,
      lastMessage: item.body,
      lastMessageDate: item.createdAt,
      fromMe: item.fromMe,
      read: item.read,
      messages: []
    }));

    const totalCountQuery = Prisma.sql`
      SELECT COUNT(*) AS total
      FROM (
        SELECT m.peopleId
        FROM messages m
        INNER JOIN (
          SELECT peopleId, MAX(createdAt) AS latest
          FROM messages
          GROUP BY peopleId
        ) latest_msg ON m.peopleId = latest_msg.peopleId AND m.createdAt = latest_msg.latest
        INNER JOIN persona c ON c.ID_PERSONAL = m.peopleId
        ${search ? Prisma.sql`
          WHERE c.NOMBRE LIKE ${`%${search}%`} OR c.CELULAR LIKE ${`%${search}%`}
        ` : Prisma.empty}
      ) AS subquery;
    `;


    const totalResult = await this.prisma.$queryRaw(totalCountQuery);

    let total = 0;
    let last_page = 1;

    if (Array.isArray(totalResult) && totalResult.length > 0) {
      total = Number(totalResult[0].total);
      last_page = Math.ceil(total / parseInt(perPage));
    }

    return {
      data,
      total: 0,
      last_page: 1,
    };
  }

  async getChatByContact(peopleId: number) {
    const messages = await this.prisma.messages.findMany({
      select: {
        id: true,
        body: true,
        ack: true,
        read: true,
        mediaType: true,
        mediaUrl: true,
        fromMe: true,
        isDelete: true,
        createdAt: true,
      },
      where: { peopleId },
      orderBy: { createdAt: 'asc' },
    });

    return messages;
  }

  async getContactOrCreate(data: any) {
    const contact = await this.prisma.people.findUnique({
      where: { id: data.peopleId },
      select: {
        id: true,
        name: true,
        // profilePicUrl: true,
      },
    });

    if (contact) {
      return contact;
    }

    const newContact = await this.prisma.people.create({
      data: data,
    });

    return newContact;
  }

  async sendMessage(userId: number, data: SendMessage) {
    let body: any = {};
    let messageId: string = "";

    if (data.template) {
      const template = JSON.parse(data.template) as detailTemplate;

      body = {
        "messaging_product": "whatsapp",
        "to": data.number,
        "type": "template",
        "template": {
          "name": template.name,
          "language": { "code": template.language },
          "components": template.components
        }
      }

    } else {
      body = {
        "messaging_product": "whatsapp",
        "to": data.number,
        "type": "text",
        "text": {
          "body": data.message
        }
      }
    }

    // console.log(body);

    const response = await firstValueFrom(this.httpService.post(this.url + "/messages", body, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.token}`,
      },
    }));

    // console.log("response", response.data);

    if (response.status === 200) {
      messageId = response.data.messages[0].id;
    }

    const message = await this.prisma.messages.create({
      data: {
        messageId: messageId,
        body: data.message,
        mediaType: data.mediaType,
        fromMe: 1,
        peopleId: +data.peopleId,
        createdAt: new Date(),
        read: 1,
        ack: 0,
        isDelete: 0,
      },
    });

    const newMessage = {
      id: message.id,
      body: message.body,
      ack: message.ack,
      read: message.read,
      mediaType: message.mediaType,
      mediaUrl: message.mediaUrl,
      fromMe: message.fromMe,
      isDelete: message.isDelete,
      createdAt: message.createdAt,
      profilePicUrl: null,
      peopleId: data.peopleId,
    };

    return newMessage;
  }

  async createMessage(data: StoreMessage) {
    const message = await this.prisma.messages.create({
      data: {
        messageId: data.messageId,
        body: data.body,
        mediaType: data.mediaType,
        fromMe: data.fromMe,
        peopleId: data.peopleId,
        read: data.read,
        ack: data.ack,
        isDelete: data.isDelete,
      },
    });

    console.log("Mensaje creado:", message);


    return true;
  }

  async getTemplates() {
    // const templates = await this.prisma.templates.findMany({
    //   select: {
    //     id: true,
    //     name: true,
    //   },
    // });
    const response = await firstValueFrom(this.httpService.get(this.urlTemplates + "/message_templates", {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.token}`,
      },
    }));

    return response.data;
  }
}