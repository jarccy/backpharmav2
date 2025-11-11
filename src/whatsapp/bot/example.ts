import qrCode from 'qrcode-terminal';
import { Client, LocalAuth } from 'whatsapp-web.js';
// import { getIO } from './socket';
import { Whatsapp } from '../dto/whatsapp.dto';
import AppError from '../functions/AppError';
// import { handleMessage } from '../services/WbotServices/wbotMessageListener';

interface Session extends Client {
  id?: number;
}

const sessions: Session[] = [];

const syncUnreadMessages = async (wbot: Session) => {
  const chats = await wbot.getChats();

  for (const chat of chats) {
    if (chat.unreadCount > 0) {
      const unreadMessages = await chat.fetchMessages({
        limit: chat.unreadCount,
      });

      for (const msg of unreadMessages) {
        console.log(msg);

        // await handleMessage(msg, wbot);
      }

      await chat.sendSeen();
    }
  }
};

export const initWbot = async (whatsapp: Whatsapp): Promise<Session> => {
  return new Promise((resolve, reject) => {
    try {
      const io = "" as any; //getIO();
      const sessionName = whatsapp.name;
      let sessionCfg;

      if (whatsapp && whatsapp.session) {
        sessionCfg = JSON.parse(whatsapp.session);
      }

      const args: String = process.env.CHROME_ARGS || '';

      const wbot: Session = new Client({
        session: sessionCfg,
        authStrategy: new LocalAuth({ clientId: 'bd_' + whatsapp.id }),
        puppeteer: {
          executablePath: process.env.CHROME_BIN || undefined,
          browserWSEndpoint: process.env.CHROME_WS || undefined,
          args: args.split(' '),
        },
      });

      wbot.initialize();

      wbot.on('qr', async (qr) => {
        console.info('Session:', sessionName);
        qrCode.generate(qr, { small: true });
        // await whatsapp.update({ qrcode: qr, status: 'qrcode', retries: 0 });

        const sessionIndex = sessions.findIndex((s) => s.id === whatsapp.id);
        if (sessionIndex === -1) {
          wbot.id = whatsapp.id;
          sessions.push(wbot);
        }

        io.emit('whatsappSession', {
          action: 'update',
          session: whatsapp,
        });
      });

      wbot.on('authenticated', async (session) => {
        console.info(`Session: ${sessionName} AUTHENTICATED`);
      });

      wbot.on('auth_failure', async (msg) => {
        console.error(
          `Session: ${sessionName} AUTHENTICATION FAILURE! Reason: ${msg}`,
        );

        if (whatsapp.retries > 1) {
          // await whatsapp.update({ session: '', retries: 0 });
        }

        const retry = whatsapp.retries;
        // await whatsapp.update({
        //   status: 'DISCONNECTED',
        //   retries: retry + 1,
        // });

        io.emit('whatsappSession', {
          action: 'update',
          session: whatsapp,
        });

        reject(new Error('Error starting whatsapp session.'));
      });

      wbot.on('ready', async () => {
        console.info(`Session: ${sessionName} READY`);

        // await whatsapp.update({
        //   status: 'CONNECTED',
        //   qrcode: '',
        //   retries: 0,
        // });

        io.emit('whatsappSession', {
          action: 'update',
          session: whatsapp,
        });

        const sessionIndex = sessions.findIndex((s) => s.id === whatsapp.id);
        if (sessionIndex === -1) {
          wbot.id = whatsapp.id;
          sessions.push(wbot);
        }

        wbot.sendPresenceAvailable();
        await syncUnreadMessages(wbot);

        resolve(wbot);
      });
    } catch (err) {
      console.error(err);
    }
  });
};

export const getWbot = (whatsappId: number): Session => {
  const sessionIndex = sessions.findIndex((s) => s.id === whatsappId);

  if (sessionIndex === -1) {
    throw new AppError('ERR_WAPP_NOT_INITIALIZED');
  }
  return sessions[sessionIndex];
};

export const removeWbot = (whatsappId: number): void => {
  try {
    const sessionIndex = sessions.findIndex((s) => s.id === whatsappId);
    if (sessionIndex !== -1) {
      sessions[sessionIndex].destroy();
      sessions.splice(sessionIndex, 1);
    }
  } catch (err) {
    console.error(err);
  }
};


// import { Injectable, Logger } from '@nestjs/common';
// import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
// import { WhatsappGateway } from './socket.gateaway';
// import { ContactService } from '../services/contact.service';
// import { MessageService } from '../services/message.service';
// import { ConnectionService } from '../services/connection.service';
// import {
//   sendMessageTask,
//   StoreManyMessage,
//   StoreMessage,
// } from '../dto/message.dto';
// import { convertFileToBase64 } from 'src/common/functions';
// import { SaveImage } from '../functions';

// @Injectable()
// export class WhatsappService {
//   private client: Client;
//   private readonly logger = new Logger(WhatsappService.name);

//   constructor(
//     private readonly whatsappGateway: WhatsappGateway,
//     private readonly contactService: ContactService,
//     private readonly messageService: MessageService,
//     private readonly connectionService: ConnectionService,
//   ) {
//     this.initClient();
//   }

//   private initClient() {
//     this.client = new Client({
//       authStrategy: new LocalAuth(
//         {
//           clientId: 'default',
//           dataPath: 'sessions',
//         }
//       ),
//       puppeteer: {
//         headless: true,
//         args: ['--no-sandbox', '--disable-setuid-sandbox'],
//       },
//       webVersionCache: {
//         type: 'remote',
//         remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
//       }
//     });

//     this.client.on('qr', (qr: string) => {
//       // this.connectionService.updateWhatsapp(1, {
//       //   session: 'default',
//       //   qrcode: qr,
//       // });

//       this.whatsappGateway.emitEvent('newQr', qr);
//     });

//     this.client.on('ready', async () => {
//       await this.connectionService.updateStatusWhatsapp(1, 'Conectado');

//       this.whatsappGateway.emitEvent('status', 'ready');
//       this.logger.log('WhatsApp is ready!');
//     });

//     this.client.on('message', async (message) => {
//       if (message.from != 'status@broadcast' && !message.from.endsWith('@g.us') && (message.type === 'chat' || message.type === 'image')) {
//         const detailContact = await message.getContact();
//         let contact = await this.contactService.getContactByNumber(
//           detailContact.number,
//         );

//         if (!contact) {
//           const newContact = {
//             name: detailContact.name ?? 'Sin Nombre',
//             number: detailContact.number,
//             profilePicUrl: await this.client.getProfilePicUrl(message.from),
//           };
//           contact = await this.contactService.create(newContact);
//         }

//         let image = null;
//         if (message.hasMedia) {
//           const media = await message.downloadMedia();
//           if (media) {
//             image = await SaveImage(media.data, './public/messages');
//           }
//         }

//         const newMessage = {
//           body: message.body,
//           ack: message.ack,
//           read: 0,
//           mediaType: message.type,
//           mediaUrl: image,
//           fromMe: message.fromMe == false ? 0 : 1,
//           peopleId: contact,
//           whatsappId: 1,
//         };

//         const nMessage = await this.messageService.create(newMessage);
//         this.whatsappGateway.emitEvent('MessageReceived', nMessage);
//       }
//     });

//     this.client.on('auth_failure', (msg) => {
//       this.whatsappGateway.emitEvent('status', 'fail');
//       this.logger.error('❌ Fallo de autenticación:', msg);
//     });

//     this.client.on('disconnected', async (reason) => {
//       this.whatsappGateway.emitEvent('status', `disconnected`);
//       this.logger.warn(`⚠️ Sesión cerrada: ${reason}`);

//       try {
//         await this.client.logout();
//         await this.connectionService.updateStatusWhatsapp(1, 'Desconectado');
//         await this.client.destroy();
//         this.logger.log('🧹 Cliente destruido, esperando reinicio...');

//         setTimeout(() => {
//           this.initClient();
//           this.logger.log('🔄 Cliente reiniciado');
//         }, 7000);
//       } catch (err) {
//         this.logger.error('❌ Error al reiniciar el cliente:', err);
//       }
//     });

//     process.on('uncaughtException', (err) => {
//       console.error('🚨 Excepción no capturada:', err);
//     });

//     // this.client.initialize();
//   }

//   async sendWSMessage(
//     data: StoreMessage,
//     user: number,
//     file: string,
//   ): Promise<string> {
//     try {
//       let fileBase = null;
//       let options: { media?: any } = {};

//       if (file) {
//         let fileUrl = file.split('/public')[1];
//         fileBase = convertFileToBase64(fileUrl);
//         options.media = new MessageMedia('image/jpeg', fileBase, 'archivo.jpg');
//       }

//       const numberId = await this.client.getNumberId(`${data.number}`);

//       if (!numberId || !numberId._serialized) {
//         return 'error';
//       }

//       await this.client.sendMessage(
//         `${numberId._serialized}`,
//         data.message,
//         options,
//       );

//       const newMessage = {
//         body: data.message,
//         ack: 0,
//         read: 0,
//         mediaType: data.mediaType,
//         fromMe: 1,
//         peopleId: parseInt(data.peopleId.toString()),
//         mediaUrl: file ?? null,
//         whatsappId: 1,
//       };

//       await this.messageService.create(newMessage);
//       return 'success';
//     } catch (error) {
//       console.error('Error al enviar el mensaje:', error);
//       return 'error';
//     }
//   }

//   // async sendManyMessage(data: StoreManyMessage, user: number): Promise<string> {
//   //   try {
//   //     let fileBase = null;
//   //     let options: { media?: any } = {};
//   //     let mess = await this.messageService.teemmplate(+data.templateId);

//   //     if (mess.file) {
//   //       let fileUrl = mess.file.split('/public')[1];
//   //       fileBase = convertFileToBase64(fileUrl);

//   //       options.media = new MessageMedia('image/jpeg', fileBase, 'archivo.jpg');
//   //     }

//   //     data.patients.forEach(async (patient) => {
//   //       try {
//   //         const numberId = await this.client.getNumberId(`${patient.number}`);

//   //         if (numberId) {
//   //           setTimeout(async () => {
//   //             await this.client.sendMessage(
//   //               `${numberId._serialized}`,
//   //               mess.message,
//   //               options,
//   //             );

//   //             let contact = await this.contactService.getContactByNumber(
//   //               patient.number,
//   //             );

//   //             if (!contact) {
//   //               const newContact = {
//   //                 name: patient.name,
//   //                 number: patient.number,
//   //               };
//   //               contact = await this.contactService.create(newContact);
//   //             }

//   //             const newMessage = {
//   //               body: mess.message,
//   //               ack: 0,
//   //               read: 0,
//   //               mediaType: mess.file ? 'image' : 'chat',
//   //               fromMe: 1,
//   //               peopleId: contact,
//   //               mediaUrl: mess.file ?? null,
//   //               whatsappId: 1,
//   //             };

//   //             this.messageService.create(newMessage);
//   //           }, 300);
//   //         }
//   //       } catch (error) {
//   //         console.error('Error al verificar el número:', error);
//   //       }
//   //     });
//   //     return 'success';
//   //   } catch (error) {
//   //     console.error('Error al enviar el mensaje:', error);
//   //     return 'error';
//   //   }
//   // }

//   async sendTaskMessage(
//     data: sendMessageTask,
//     user: number,
//     file: string,
//   ): Promise<string> {
//     try {
//       let fileBase = null;
//       let options: { media?: any } = {};

//       if (file) {
//         let fileUrl = file.split('/public')[1];
//         fileBase = convertFileToBase64(fileUrl);
//         options.media = new MessageMedia('image/jpeg', fileBase, 'archivo.jpg');
//       }

//       const numberId = await this.client.getNumberId(`${data.number}`);

//       if (!numberId || !numberId._serialized) {
//         return 'error';
//       }

//       await this.client.sendMessage(
//         `${numberId._serialized}`,
//         data.message,
//         options,
//       );

//       const newMessage = {
//         body: data.message,
//         ack: 0,
//         read: 0,
//         mediaType: data.mediaType,
//         fromMe: 1,
//         peopleId: parseInt(data.peopleId.toString()),
//         mediaUrl: file ?? null,
//         whatsappId: 1,
//       };

//       await this.messageService.create(newMessage);
//       return 'success';
//     } catch (error) {
//       console.error('Error al enviar el mensaje:', error);
//       return 'error';
//     }
//   }

//   async closeClient() {
//     try {
//       await this.client.logout();
//       await this.connectionService.updateStatusWhatsapp(1, 'Desconectado');
//       await this.client.destroy();

//       setTimeout(async () => {
//         this.whatsappGateway.emitEvent('status', `disconnected`);
//         this.initClient();
//         this.logger.log('Sesión de WhatsApp cerrada.');
//       }, 7000);
//       return true;
//     } catch (err) {
//       this.logger.error('❌ Error al destruir el cliente:', err);
//       return false;
//     }
//   }
// }


//Controller eliminado
// @UseGuards(AuthGuard)
// @Controller('ws')
// export class WSController {
//   constructor(private readonly wsService: WhatsappService) { }

//   @Post('send-message')
//   @UseInterceptors(
//     FileInterceptor('file', {
//       storage: diskStorage({
//         destination: (req, file, callback) => {
//           const dirPath = './public/messages';
//           if (!fs.existsSync(dirPath)) {
//             fs.mkdirSync(dirPath, { recursive: true });
//           }
//           callback(null, dirPath);
//         },
//         filename: (req, file, callback) => {
//           const uniqueSuffix =
//             Date.now() + '-' + Math.round(Math.random() * 1e9);
//           const originalName = file.originalname.replace(/\s/g, '_');
//           callback(null, `${uniqueSuffix}-${originalName}`);
//         },
//       }),
//     }),
//   )
//   async sendMessage(
//     @UploadedFile() file: Express.Multer.File,
//     @ActiveUser() user: UserActiveI,
//     @Body() body: StoreMessage,
//   ) {
//     let fileUrl = null;
//     if (file) {
//       fileUrl = `${process.env.BASE_URL}/public/messages/${file.filename}`;
//     }
//     const response = await this.wsService.sendWSMessage(
//       body,
//       +user.id,
//       fileUrl,
//     );
//     return response;
//   }

//   @Post('send-many-message')
//   async sendManyMessage(
//     @ActiveUser() user: UserActiveI,
//     @Body() body: StoreManyMessage,
//   ) {
//     try {
//       // await this.wsService.sendManyMessage(body, +user.id);
//       return { status: 200, message: 'Success' };
//     } catch (error) {
//       return { status: 400, message: 'Error' };
//     }
//   }

//   @Post('disconnect')
//   async disconnectWS() {
//     try {
//       await this.wsService.closeClient();
//       return true;
//     } catch (error) {
//       return { status: 400, message: 'Error' };
//     }
//   }
// }


//sockets eliminados

// import { Server as SocketIO } from 'socket.io';
// import { Server } from 'http';
// import AppError from '../functions/AppError';

// let io: SocketIO;

// export const initIO = (httpServer: Server): SocketIO => {
//   io = new SocketIO(httpServer, {
//     cors: {
//       origin: process.env.FRONTEND_URL,
//     },
//   });

//   io.on('connection', (socket) => {
//     socket.on('joinChatBox', (ticketId: string) => {
//       console.info('A client joined a ticket channel');
//       socket.join(ticketId);
//     });

//     socket.on('joinNotification', () => {
//       console.info('A client joined notification channel');
//       socket.join('notification');
//     });

//     socket.on('joinTickets', (status: string) => {
//       console.info(`A client joined to ${status} tickets channel.`);
//       socket.join(status);
//     });

//     socket.on('disconnect', () => {
//       console.info('Client disconnected');
//     });

//     return socket;
//   });
//   return io;
// };

// export const getIO = (): SocketIO => {
//   if (!io) {
//     throw new AppError('Socket IO not initialized');
//   }
//   return io;
// };