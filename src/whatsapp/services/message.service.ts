import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { SendMessage, StoreMessage, UpdateMessage, detailTemplate, sendMessageTask, configWhatsapp } from '../dto/message.dto';
import { GetDTO } from '../../common/dto/params-dto';
import { Prisma } from '@prisma/client';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { WhatsappGateway } from '../websockets/socket.gateaway';
const dayjs = require('dayjs');


@Injectable()
export class MessageService implements OnModuleInit {
  private readonly url = process.env.URL;
  private configWhatsapp: configWhatsapp;

  constructor(private prisma: PrismaService, private httpService: HttpService,
    private ws: WhatsappGateway
  ) { }

  async onModuleInit() {
    this.configWhatsapp = await this.prisma.whatsapps.findFirst({
      select: {
        number: true,
        metaToken: true,
        templateCode: true,
        messageCode: true,
        timezone: true,
      }
    });
    return this.configWhatsapp;
  }

  async getChats(dto: GetDTO) {
    const { search, perPage, page } = dto;

    const query = Prisma.sql`
      SELECT m.id, m.body, m.ack, m.mediaType, m.fromMe, m.createdAt, m.peopleId AS peopleId,
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
        ack: number;
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
      ack: item.ack,
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

  //Sending Message
  async sendMessage(userId: number, data: SendMessage) {
    let body: any = {};
    let messageId: string = "";
    let getUrlImage: string = "";

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

      template.components.forEach((component) => {
        component.parameters?.forEach((parameter) => {
          if (parameter.type === 'image') {
            getUrlImage = parameter.image.link;
          }
        });
      });

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

    console.log("body++++", JSON.stringify(body, null, 2));

    try {
      const message = await this.prisma.messages.create({
        data: {
          messageId: null,
          number: data.number,
          body: data.message,
          mediaType: data.mediaType,
          mediaUrl: getUrlImage,
          fromMe: 1,
          peopleId: +data.peopleId,
          createdAt: dayjs(data.createdAt).toDate(),
          ack: 0,
          isDelete: 0,
          userId: +userId
        },
      });

      const response = await firstValueFrom(this.httpService.post(this.url + this.configWhatsapp.messageCode + "/messages", body, {
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${this.configWhatsapp.metaToken}` },
      }));

      console.log("Meta Response", response.data);

      if (response.status === 200) {
        messageId = response.data.messages[0].id;
        await this.prisma.messages.update({ where: { id: message.id }, data: { messageId } });
      }

      return {
        sending: true,
        newId: message.id,
        temporalId: data.temporalId,
      };

    } catch (error) {
      console.log("Meta Error", error.response.data);
      return {
        sending: false,
        newId: null,
        temporalId: data.temporalId,
      };
    }
  }

  //Get or Create People
  async createPeople(dto: { number: string, name: string }) {
    const verifyPhone = await this.prisma.people.findFirst({ where: { phone: dto.number.trim() } });
    if (verifyPhone) { return verifyPhone.id; }

    const lastId = await this.prisma.people.findFirst({ orderBy: { id: 'desc' }, select: { id: true } });

    const newId = lastId?.id ? lastId.id + 1 : 1;
    const people = await this.prisma.people.create({ data: { ...dto, id: newId } });

    const lastIdRelation = await this.prisma.relationPdv.findFirst({
      orderBy: { id: 'desc' }, select: { id: true }
    });

    const newIdRelation = lastIdRelation?.id ? lastIdRelation.id + 1 : 1;

    await this.prisma.relationPdv.create({
      data: {
        id: newIdRelation,
        peopleId: newId,
        entityId: null,
        pdvId: null,
        status: 'ACTIVE',
        createdAt: new Date(),
      } as any,
    });

    return people.id;
  }

  //Create new Message
  async createMessage(data: StoreMessage) {
    const peopleId = await this.createPeople({ number: data.number, name: data.name });

    const message = await this.prisma.messages.create({
      data: {
        messageId: data.messageId,
        number: data.number,
        timestamp: data.timestamp,
        mediaType: data.mediaType,
        body: data.body,
        fromMe: 0,
        peopleId: peopleId,
        ack: 1,
        isDelete: 0,
        mediaId: data.mediaId,
        createdAt: new Date()
      },
    });

    const newMessage = {
      id: message.id,
      peopleName: data.name,
      peopleId: peopleId,
      number: data.number,
      messageId: data.messageId,
      body: data.body,
      ack: 1,
      fromMe: 0,
      mediaType: data.mediaType,
      mediaUrl: data.mediaUrl,
      isDelete: 0,
      createdAt: message.createdAt,
    }

    this.ws.emitEvent("newMessage", newMessage)

    // console.log("Mensaje creado:", message);

    return true;
  }

  //Update status to Message
  async updateMessageStatus(data: UpdateMessage) {
    let ack: number;

    if (data.status === 'sent') {
      ack = 1;
    } else if (data.status === 'delivered') {
      ack = 2;
    } else if (data.status === 'read') {
      ack = 3;
    } else {
      ack = 0;
    }

    const message = await this.prisma.messages.update({
      where: {
        id: (
          await this.prisma.messages.findFirst({
            where: {
              messageId: data.messageId,
              number: data.number,
            },
            select: { id: true },
          })
        )?.id,
      },
      data: {
        timestamp: data.timestamp,
        ack: ack,
        isDelete: data.isDelete,
      },
    });

    const updateMessage = {
      id: message.id,
      messageId: data.messageId,
      number: data.number,
      newStatus: ack
    }

    this.ws.emitEvent("updateMessage", updateMessage)
    // console.log("Mensaje actualizado:", message);

    return true;
  }

  async getTemplates() {
    try {
      const response = await firstValueFrom(this.httpService.get(this.url + this.configWhatsapp.templateCode + "/message_templates", {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.configWhatsapp.metaToken}`,
        },
      }));

      return response.data;
    } catch (error) {
      console.log("Meta Error", error.response.data);
      return false;
    }
  }

  //Sending for Calendar
  async sendCalendarMessage(data: sendMessageTask) {
    let body: any = {};
    let messageId: string = "";

    const template = data.template;
    let componentt = JSON.parse(template.componentsSend);

    componentt.forEach((component) => {
      component.parameters?.forEach((parameter) => {
        if (parameter.type === "text" && parameter.text === "{{1}}") { parameter.text = data.name }
        else if (parameter.type === "text" && parameter.text === "{{2}}") { parameter.text = data.name }
        else if (parameter.type === "text" && parameter.text === "{{3}}") { parameter.text = data.name }
      });
    });


    body = {
      "messaging_product": "whatsapp",
      "to": data.number,
      "type": "template",
      "template": {
        "name": template.name,
        "language": { "code": template.language },
        "components": componentt
      }
    }

    let msg = data.message

    if (msg.includes("{{1}}")) { msg = msg.replace("{{1}}", data.name) }
    if (msg.includes("{{2}}")) { msg = msg.replace("{{2}}", data.name) }
    if (msg.includes("{{3}}")) { msg = msg.replace("{{3}}", data.name) }


    // console.log("calendar-body", JSON.stringify(body, null, 2));

    try {
      const message = await this.prisma.messages.create({
        data: {
          messageId: null,
          number: data.number,
          body: msg,
          mediaType: data.file ? "image" : "text",
          mediaUrl: data.file,
          fromMe: 1,
          peopleId: +data.peopleId,
          createdAt: dayjs(data.createdAt).toDate(),
          ack: 0,
          isDelete: 0,
          userId: +data.userId
        },
      });

      const response = await firstValueFrom(this.httpService.post(this.url + this.configWhatsapp.messageCode + "/messages", body, {
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${this.configWhatsapp.metaToken}` },
      }));

      // console.log("Meta Response", response.data);

      if (response.status === 200) {
        messageId = response.data.messages[0].id;
        await this.prisma.messages.update({ where: { id: message.id }, data: { messageId } });
      }

      return true;

    } catch (error) {
      console.log("Meta Error", error.response.data);
      return false;
    }
  }
}