import { Client, LocalAuth } from 'whatsapp-web.js';
import { Whatsapp } from '../dto/whatsapp.dto';
import { PrismaService } from '../../prisma.service';
import { WhatsappGateway } from '../websockets/socket.gateaway';
import AppError from '../functions/AppError';
import { SaveImage } from '../functions';
// import { handleMessage } from '../services/WbotServices/wbotMessageListener';

interface Session extends Client {
  id?: number;
}

const sessions: Session[] = [];
const prisma = new PrismaService();

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

export const initWbot = async (whatsapp: Whatsapp, io: WhatsappGateway): Promise<Session> => {
  return new Promise((resolve, reject) => {
    try {
      const sessionName = whatsapp.name;
      let sessionCfg;

      if (whatsapp && whatsapp.session) {
        sessionCfg = JSON.parse(whatsapp.session);
      }

      const wbot: Session = new Client({
        session: sessionCfg,
        authStrategy: new LocalAuth({ clientId: 'bd_' + whatsapp.id, dataPath: 'sessions' }),
        puppeteer: {
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        },
        webVersionCache: {
          type: 'remote',
          remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html',
        }
      });

      wbot.initialize();

      wbot.on('qr', async (qr) => {

        await prisma.whatsapps.update({
          where: { id: whatsapp.id },
          data: { qrcode: qr, status: 'Desconectado', retries: 0 },
        });

        const sessionIndex = sessions.findIndex((s) => s.id === whatsapp.id);
        if (sessionIndex === -1) {
          wbot.id = whatsapp.id;
          sessions.push(wbot);
        }

        io.emitEvent('newQr', { qr: qr, id: whatsapp.id });
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

        // const retry = whatsapp.retries;
        // await whatsapp.update({
        //   status: 'DISCONNECTED',
        //   retries: retry + 1,
        // });

        // io.emit('whatsappSession', {
        //   action: 'update',
        //   session: whatsapp,
        // });

        reject(new Error('Error starting whatsapp session.'));
      });

      wbot.on('ready', async () => {
        console.info(`Session: ${sessionName} READY`);

        await prisma.whatsapps.update({
          where: { id: whatsapp.id },
          data: { qrcode: '', status: 'Conectado', retries: 0 },
        });

        io.emitEvent('status', { status: 'ready', id: whatsapp.id });

        const sessionIndex = sessions.findIndex((s) => s.id === whatsapp.id);
        if (sessionIndex === -1) {
          wbot.id = whatsapp.id;
          sessions.push(wbot);
        }

        // wbot.sendPresenceAvailable();
        // await syncUnreadMessages(wbot);

        resolve(wbot);
      });

      wbot.on('message', async (message) => {
        if (message.from != 'status@broadcast' && !message.from.endsWith('@g.us') && (message.type === 'chat' || message.type === 'image')) {
          const detailContact = await message.getContact();

          let contactDetail = await prisma.people.findFirst({
            where: { phone: detailContact.number }
          });

          let contact = contactDetail ? contactDetail.id : null;

          if (!contact) {
            const lastId = await prisma.people.findFirst({
              orderBy: { id: 'desc' }, select: { id: true }
            });

            const newId = lastId?.id ? lastId.id + 1 : 1;

            const newContact = {
              name: detailContact.name ?? 'Sin Nombre',
              phone: detailContact.number,
              profilePicUrl: await wbot.getProfilePicUrl(message.from),
            };

            contactDetail = await prisma.people.create({ data: { ...newContact, id: newId } });

            const lastIdRelation = await prisma.relationPdv.findFirst({
              orderBy: { id: 'desc' }, select: { id: true }
            });

            const newIdRelation = lastIdRelation?.id ? lastIdRelation.id + 1 : 1;

            await prisma.relationPdv.create({
              data: {
                id: newIdRelation,
                peopleId: newId,
                entityId: null,
                pdvId: null,
                status: null,
                createdAt: new Date(),
              } as any,
            });

            contact = newId;
          }

          let image = null;
          if (message.hasMedia) {
            const media = await message.downloadMedia();
            if (media) {
              image = await SaveImage(media.data, './public/messages');
            }
          }

          const messageDetail = await prisma.messages.create({
            data: {
              body: message.body,
              ack: message.ack,
              read: 0,
              mediaType: message.type,
              mediaUrl: image,
              fromMe: message.fromMe == false ? 0 : 1,
              peopleId: contact,
              whatsappId: 1
            },
          });

          io.emitEvent('MessageReceived', {
            id: messageDetail.id,
            body: messageDetail.body,
            ack: messageDetail.ack,
            read: messageDetail.read,
            mediaType: messageDetail.mediaType,
            mediaUrl: messageDetail.mediaUrl,
            fromMe: messageDetail.fromMe,
            isDelete: messageDetail.isDelete,
            createdAt: messageDetail.createdAt,
            profilePicUrl: null,
            name: contactDetail.name,
            contactId: contactDetail.id,
          });
        }
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
      sessions[sessionIndex].logout();
      sessions[sessionIndex].destroy();
      sessions.splice(sessionIndex, 1);
      console.log(`Session: ${whatsappId} REMOVED`);
    }
  } catch (err) {
    console.error(err);
  }
};
