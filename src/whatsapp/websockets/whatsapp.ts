import { Injectable, Logger } from '@nestjs/common';
import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import { WhatsappGateway } from './socket.gateaway';
import { ContactService } from '../services/contact.service';
import { MessageService } from '../services/message.service';
import { ConnectionService } from '../services/connection.service';
import {
  sendMessageTask,
  StoreManyMessage,
  StoreMessage,
} from '../dto/message.dto';
import { convertFileToBase64 } from 'src/common/functions';
import { SaveImage } from '../functions';

@Injectable()
export class WhatsappService {
  private client: Client;
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly whatsappGateway: WhatsappGateway,
    private readonly contactService: ContactService,
    private readonly messageService: MessageService,
    private readonly connectionService: ConnectionService,
  ) {
    this.initClient();
  }

  private initClient() {
    this.client = new Client({
      authStrategy: new LocalAuth(
        {
          clientId: 'default',
          dataPath: 'sessions',
        }
      ),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
      webVersionCache: {
        type: 'remote',
        remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
      }
    });

    this.client.on('qr', (qr: string) => {
      // this.connectionService.updateWhatsapp(1, {
      //   session: 'default',
      //   qrcode: qr,
      // });

      this.whatsappGateway.emitEvent('newQr', qr);
    });

    this.client.on('ready', async () => {
      await this.connectionService.updateStatusWhatsapp(1, 'Conectado');

      this.whatsappGateway.emitEvent('status', 'ready');
      this.logger.log('WhatsApp is ready!');
    });

    this.client.on('message', async (message) => {
      if (message.from != 'status@broadcast' && !message.from.endsWith('@g.us') && (message.type === 'chat' || message.type === 'image')) {
        const detailContact = await message.getContact();
        let contact = await this.contactService.getContactByNumber(
          detailContact.number,
        );

        if (!contact) {
          const newContact = {
            name: detailContact.name ?? 'Sin Nombre',
            number: detailContact.number,
            profilePicUrl: await this.client.getProfilePicUrl(message.from),
          };
          contact = await this.contactService.create(newContact);
        }

        let image = null;
        if (message.hasMedia) {
          const media = await message.downloadMedia();
          if (media) {
            image = await SaveImage(media.data, './public/messages');
          }
        }

        const newMessage = {
          body: message.body,
          ack: message.ack,
          read: 0,
          mediaType: message.type,
          mediaUrl: image,
          fromMe: message.fromMe == false ? 0 : 1,
          peopleId: contact,
          whatsappId: 1,
        };

        const nMessage = await this.messageService.create(newMessage);
        this.whatsappGateway.emitEvent('MessageReceived', nMessage);
      }
    });

    this.client.on('auth_failure', (msg) => {
      this.whatsappGateway.emitEvent('status', 'fail');
      this.logger.error('❌ Fallo de autenticación:', msg);
    });

    this.client.on('disconnected', async (reason) => {
      this.whatsappGateway.emitEvent('status', `disconnected`);
      this.logger.warn(`⚠️ Sesión cerrada: ${reason}`);

      try {
        await this.client.logout();
        await this.connectionService.updateStatusWhatsapp(1, 'Desconectado');
        await this.client.destroy();
        this.logger.log('🧹 Cliente destruido, esperando reinicio...');

        setTimeout(() => {
          this.initClient();
          this.logger.log('🔄 Cliente reiniciado');
        }, 7000);
      } catch (err) {
        this.logger.error('❌ Error al reiniciar el cliente:', err);
      }
    });

    process.on('uncaughtException', (err) => {
      console.error('🚨 Excepción no capturada:', err);
    });

    // this.client.initialize();
  }

  async sendWSMessage(
    data: StoreMessage,
    user: number,
    file: string,
  ): Promise<string> {
    try {
      let fileBase = null;
      let options: { media?: any } = {};

      if (file) {
        let fileUrl = file.split('/public')[1];
        fileBase = convertFileToBase64(fileUrl);
        options.media = new MessageMedia('image/jpeg', fileBase, 'archivo.jpg');
      }

      const numberId = await this.client.getNumberId(`${data.number}`);

      if (!numberId || !numberId._serialized) {
        return 'error';
      }

      await this.client.sendMessage(
        `${numberId._serialized}`,
        data.message,
        options,
      );

      const newMessage = {
        body: data.message,
        ack: 0,
        read: 0,
        mediaType: data.mediaType,
        fromMe: 1,
        peopleId: parseInt(data.peopleId.toString()),
        mediaUrl: file ?? null,
        whatsappId: 1,
      };

      await this.messageService.create(newMessage);
      return 'success';
    } catch (error) {
      console.error('Error al enviar el mensaje:', error);
      return 'error';
    }
  }

  async sendManyMessage(data: StoreManyMessage, user: number): Promise<string> {
    try {
      let fileBase = null;
      let options: { media?: any } = {};
      let mess = await this.messageService.getTemplatebyId(+data.templateId);

      if (mess.file) {
        let fileUrl = mess.file.split('/public')[1];
        fileBase = convertFileToBase64(fileUrl);

        options.media = new MessageMedia('image/jpeg', fileBase, 'archivo.jpg');
      }

      data.patients.forEach(async (patient) => {
        try {
          const numberId = await this.client.getNumberId(`${patient.number}`);

          if (numberId) {
            setTimeout(async () => {
              await this.client.sendMessage(
                `${numberId._serialized}`,
                mess.message,
                options,
              );

              let contact = await this.contactService.getContactByNumber(
                patient.number,
              );

              if (!contact) {
                const newContact = {
                  name: patient.name,
                  number: patient.number,
                };
                contact = await this.contactService.create(newContact);
              }

              const newMessage = {
                body: mess.message,
                ack: 0,
                read: 0,
                mediaType: mess.file ? 'image' : 'chat',
                fromMe: 1,
                peopleId: contact,
                mediaUrl: mess.file ?? null,
                whatsappId: 1,
              };

              this.messageService.create(newMessage);
            }, 300);
          }
        } catch (error) {
          console.error('Error al verificar el número:', error);
        }
      });
      return 'success';
    } catch (error) {
      console.error('Error al enviar el mensaje:', error);
      return 'error';
    }
  }

  async sendTaskMessage(
    data: sendMessageTask,
    user: number,
    file: string,
  ): Promise<string> {
    try {
      let fileBase = null;
      let options: { media?: any } = {};

      if (file) {
        let fileUrl = file.split('/public')[1];
        fileBase = convertFileToBase64(fileUrl);
        options.media = new MessageMedia('image/jpeg', fileBase, 'archivo.jpg');
      }

      const numberId = await this.client.getNumberId(`${data.number}`);

      if (!numberId || !numberId._serialized) {
        return 'error';
      }

      await this.client.sendMessage(
        `${numberId._serialized}`,
        data.message,
        options,
      );

      const newMessage = {
        body: data.message,
        ack: 0,
        read: 0,
        mediaType: data.mediaType,
        fromMe: 1,
        peopleId: parseInt(data.peopleId.toString()),
        mediaUrl: file ?? null,
        whatsappId: 1,
      };

      await this.messageService.create(newMessage);
      return 'success';
    } catch (error) {
      console.error('Error al enviar el mensaje:', error);
      return 'error';
    }
  }

  async closeClient() {
    try {
      await this.client.logout();
      await this.connectionService.updateStatusWhatsapp(1, 'Desconectado');
      await this.client.destroy();

      setTimeout(async () => {
        this.whatsappGateway.emitEvent('status', `disconnected`);
        this.initClient();
        this.logger.log('Sesión de WhatsApp cerrada.');
      }, 7000);
      return true;
    } catch (err) {
      this.logger.error('❌ Error al destruir el cliente:', err);
      return false;
    }
  }
}
