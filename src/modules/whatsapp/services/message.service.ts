import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { SendMessage, StoreMessage, UpdateMessage, detailTemplate, sendMessageTask, configWhatsapp } from '../dto/message.dto';
import { GetDTO } from '../../../common/dto/params-dto';
import { Prisma } from '@prisma/client';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { WhatsappGateway } from '../websockets/socket.gateaway';
import * as fs from 'fs';
import * as path from 'path';
const dayjs = require('dayjs');


@Injectable()
export class MessageService implements OnModuleInit {
  private readonly url = process.env.URL + '/v22.0/';
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
      total: total,
      last_page: last_page,
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

    if (data.number && !data.phone) {
      data.phone = data.number;
      delete data.number;
    }

    const newContact = await this.prisma.people.create({
      data: data,
    });

    return newContact;
  }

  //Get MimeType
  getMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    switch (ext) {
      case '.jpg':
      case '.jpeg': return 'image/jpeg';
      case '.png': return 'image/png';
      case '.webp': return 'image/webp';
      case '.mp4': return 'video/mp4';
      case '.3gp': return 'video/3gpp';
      case '.pdf': return 'application/pdf';
      case '.doc': return 'application/msword';
      case '.docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case '.xls': return 'application/vnd.ms-excel';
      case '.xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case '.ppt': return 'application/vnd.ms-powerpoint';
      case '.pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      case '.txt': return 'text/plain';
      default: return 'application/octet-stream';
    }
  }

  //Upload Media
  async uploadMedia(file: string, mediaType: string): Promise<string | null> {
    try {
      const filePath = path.join(process.cwd(), file);
      if (!fs.existsSync(filePath)) {
        console.error("File not found for upload:", filePath);
        return null;
      }

      const formData = new FormData();
      const fileBuffer = fs.readFileSync(filePath);
      const mimeType = this.getMimeType(filePath);
      const blob = new Blob([fileBuffer], { type: mimeType });
      formData.append('file', blob, path.basename(filePath));
      formData.append('type', mediaType);
      formData.append('messaging_product', 'whatsapp');

      const response = await firstValueFrom(this.httpService.post(
        `${this.url}/${this.configWhatsapp.messageCode}/media`,
        formData,
        {
          headers: {
            "Authorization": `Bearer ${this.configWhatsapp.metaToken}`,
          }
        }
      ));

      // console.log("Meta Media Upload Response:", response.data);
      return response.data.id;
    } catch (error) {
      console.error("Error uploading media to Meta:", error.response?.data || error.message);
      return null;
    }
  }

  //Sending Message
  async sendMessage(userId: number, data: SendMessage, file: string | null) {
    let body: any = {};
    let messageId: string = "";
    let getUrlImage: string = "";
    let mediaId: string = "";

    if (data.template && data.template !== 'null') {
      const template = JSON.parse(data.template) as detailTemplate;
      console.log("template", template);

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

    } else if (file) {
      const mediaType = data.mediaType || 'image';
      const metaMediaId = await this.uploadMedia(file, mediaType);

      if (metaMediaId) {
        body = {
          "messaging_product": "whatsapp",
          "to": data.number,
          "type": mediaType,
          [mediaType]: {
            "id": metaMediaId,
            ...(data.message ? { "caption": data.message } : {})
          }
        }
        mediaId = metaMediaId;
      } else {
        throw new Error("Failed to upload media to Meta");
      }

      getUrlImage = `${process.env.BASE_URL}/${file.replace(/\\/g, '/')}`;

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

    // console.log("body++++", JSON.stringify(body, null, 2));

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
          userId: +userId,
          mediaId: mediaId
        },
      });

      const response = await firstValueFrom(this.httpService.post(this.url + this.configWhatsapp.messageCode + "/messages", body, {
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${this.configWhatsapp.metaToken}` },
      }));

      // console.log("Meta Response", response.data);

      if (response.status === 200) {
        messageId = response.data.messages[0].id;
        await this.prisma.messages.update({ where: { id: message.id }, data: { messageId } });
        await this.prisma.messageStatus.create({
          data: {
            messageId: messageId,
            status: "accepted",
            recipientId: data.number,
            pricing: response.data.messages[0].pricing ? JSON.stringify(response.data.messages[0].pricing) : "",
            billing: response.data.messages[0].pricing ? response.data.messages[0].pricing.billing : false,
            pricingModel: response.data.messages[0].pricing ? response.data.messages[0].pricing.pricingModel : "",
            category: response.data.messages[0].pricing ? response.data.messages[0].pricing.category : "",
            type: response.data.messages[0].pricing ? response.data.messages[0].pricing.type : "",
          },
        });
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
    const people = await this.prisma.people.create({
      data: {
        id: newId,
        name: dto.name,
        phone: dto.number.trim(),
      }
    });

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
        status: 1,
        createdAt: new Date(),
      } as any,
    });

    return people.id;
  }

  async downloadAndSaveMedia(mediaId: string): Promise<string | null> {
    try {
      const metaUrl = `${this.url}/${mediaId}`;
      const response = await firstValueFrom(this.httpService.get(metaUrl, {
        headers: { "Authorization": `Bearer ${this.configWhatsapp.metaToken}` }
      }));

      const downloadUrl = response.data.url;
      const mimeType = response.data.mime_type;
      const extension = mimeType.split('/')[1]?.split(';')[0] || 'jpg';

      const mediaResponse = await firstValueFrom(this.httpService.get(downloadUrl, {
        headers: { "Authorization": `Bearer ${this.configWhatsapp.metaToken}` },
        responseType: 'arraybuffer'
      }));

      const dirPath = path.join(process.cwd(), 'public', 'messages', 'received');
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }

      const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${extension}`;
      const filePath = path.join(dirPath, fileName);
      fs.writeFileSync(filePath, Buffer.from(mediaResponse.data));

      return `public/messages/received/${fileName}`;
    } catch (error) {
      console.error("Error downloading media from Meta:", error.response?.data || error.message);
      return null;
    }
  }

  //Create new Message
  async createMessage(data: StoreMessage) {
    const peopleId = await this.createPeople({ number: data.number, name: data.name });

    let mediaUrl = data.mediaUrl;
    if (data.mediaId) {
      const localMediaUrl = await this.downloadAndSaveMedia(data.mediaId);
      if (localMediaUrl) {
        mediaUrl = `${process.env.BASE_URL}/${localMediaUrl}`;
      }
    }

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
        mediaUrl: mediaUrl,
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
      mediaUrl: mediaUrl,
      isDelete: 0,
      createdAt: message.createdAt,
    }

    this.ws.emitEvent("newMessage", newMessage)

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
    } else if (data.status === 'failed') {
      ack = 4;
    } else {
      ack = 0;
    }

    try {
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

      await this.prisma.messageStatus.create({
        data: {
          messageId: data.messageId,
          status: data.status,
          recipientId: data.number,
          pricing: data.pricing ? JSON.stringify(data.pricing) : "",
          billing: data.pricing ? data.pricing.billing : false,
          pricingModel: data.pricing ? data.pricing.pricingModel : "",
          category: data.pricing ? data.pricing.category : "",
          type: data.pricing ? data.pricing.type : "",
        },
      });

      return true;
    } catch (error) {
      console.log(error);
      return false;
    }
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
      let mediaType = data.file ? (data.file.includes('.mp4') || data.file.includes('.avi') ? 'video' : 'image') : "text";
      let metaMediaId: string | null = null;

      if (data.file && mediaType !== "text") {
        const localPath = data.file.includes('public/') ? data.file.split('public/')[1] : null;
        if (localPath) {
          metaMediaId = await this.uploadMedia(`public/${localPath}`, mediaType);
        }
      }

      const message = await this.prisma.messages.create({
        data: {
          messageId: null,
          number: data.number,
          body: msg,
          mediaType: mediaType,
          mediaUrl: data.file,
          fromMe: 1,
          peopleId: +data.peopleId,
          createdAt: dayjs(data.createdAt).toDate(),
          ack: 0,
          isDelete: 0,
          userId: +data.userId,
          mediaId: metaMediaId,
        },
      });

      // Si tenemos mediaId, lo usamos en el template si aplica o en el payload
      if (metaMediaId) {
        componentt.forEach((component) => {
          if (component.type === 'header' && component.parameters) {
            component.parameters.forEach((param) => {
              if (param.type === 'image') {
                delete param.image.link;
                param.image.id = metaMediaId;
              } else if (param.type === 'video') {
                delete param.video.link;
                param.video.id = metaMediaId;
              }
            });
          }
        });

        // Actualizar el body con los componentes modificados
        body.template.components = componentt;
      }

      const response = await firstValueFrom(this.httpService.post(this.url + this.configWhatsapp.messageCode + "/messages", body, {
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${this.configWhatsapp.metaToken}` },
      }));

      // console.log("Meta Response", response.data);

      if (response.status === 200) {
        messageId = response.data.messages[0].id;
        await this.prisma.messages.update({ where: { id: message.id }, data: { messageId } });
        await this.prisma.messageStatus.create({
          data: {
            messageId: messageId,
            status: "accepted",
            recipientId: data.number,
            pricing: response.data.messages[0].pricing ? JSON.stringify(response.data.messages[0].pricing) : "",
            billing: response.data.messages[0].pricing ? response.data.messages[0].pricing.billing : false,
            pricingModel: response.data.messages[0].pricing ? response.data.messages[0].pricing.pricingModel : "",
            category: response.data.messages[0].pricing ? response.data.messages[0].pricing.category : "",
            type: response.data.messages[0].pricing ? response.data.messages[0].pricing.type : "",
          },
        });
      }

      return true;

    } catch (error) {
      console.log("Meta Error", error.response.data);
      return false;
    }
  }
}