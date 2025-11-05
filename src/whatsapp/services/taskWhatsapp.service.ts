import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WhatsappGateway } from '../websockets/socket.gateaway';
import { WhatsappService } from '../websockets/whatsapp';
import { ContactService } from './contact.service';
const dayjs = require('dayjs');


let countries = [
  { id: 1, country: 'Guatemala', timezone: 'America/Guatemala', hour: '', date: '' },
  { id: 2, country: 'Honduras', timezone: 'America/Tegucigalpa', hour: '', date: '' },
  { id: 3, country: 'Panamá', timezone: 'America/Panama', hour: '', date: '' },
  { id: 4, country: 'Nicaragua', timezone: 'America/Managua', hour: '', date: '' },
  { id: 5, country: 'Costa Rica', timezone: 'America/Costa_Rica', hour: '', date: '' },
  { id: 6, country: 'Colombia', timezone: 'America/Bogota', hour: '', date: '' },
  { id: 7, country: 'Peru', timezone: 'America/Lima', hour: '', date: '' },
];

@Injectable()
export class TaskWhatsappService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappGateway: WhatsappGateway,
    private readonly wsService: WhatsappService,
    private readonly contactService: ContactService,
  ) { }

  @Cron('*/20 * * * * *')
  taskMessage() {
    countries = countries.map((c) => {
      const localTime = dayjs().tz(c.timezone);
      return {
        ...c,
        hour: localTime.format('HH:mm'),
        date: localTime.format('YYYY-MM-DD'),
      };
    });

    // countries.forEach(async (c) => {
    //     await this.SendMessage(c.id);
    // });
    // this.SendMessage();
  }

  async SendMessage(countryId: number) {
    // this.whatsappGateway.emitEvent('test', dayjs().format('HH:mm:ss DD/MM/YYYY'));
    const patient = await this.prisma.historySending.findFirst({
      where: {
        status: 'Pendiente',
        calendar: {
          deleted: false,
          status: 'En Proceso',
          whatsappId: countryId,
        },
      },
      select: {
        id: true,
        namePatient: true,
        phone: true,
        calendar: {
          select: {
            id: true,
            userId: true,
            template: {
              select: {
                name: true,
                message: true,
                file: true,
              },
            },
          },
        },
      },
      orderBy: {
        calendar: {
          id: 'asc',
        },
      },
    });

    if (!patient) {
      return;
    }

    const verifyMediaType = patient.calendar.template.file ? 'image' : 'text';

    let contact = await this.contactService.getContactByNumber(patient.phone);

    if (!contact) {
      // console.log('No existe contacto');
      const newContact = {
        name: patient.namePatient ?? 'Sin Nombre',
        number: patient.phone,
        profilePicUrl: null,
      };
      contact = await this.contactService.create(newContact);
    }

    let body = {
      number: patient.phone,
      message: patient.calendar.template.message,
      mediaType: verifyMediaType,
      peopleId: contact,
    };

    const response = await this.wsService.sendTaskMessage(
      body,
      patient.calendar.userId,
      patient.calendar.template.file,
    );

    console.log('Task ', response);

    let statusProcess = 'Enviado';
    if (response === 'error') {
      statusProcess = 'No Enviado';
    }

    await this.prisma.historySending.update({
      where: {
        id: patient.id,
      },
      data: {
        status: statusProcess,
      },
    });

    const totalSend = await this.prisma.historySending.count({
      where: {
        status: 'Pendiente',
        calendar: {
          deleted: false,
          status: 'En Proceso',
          id: patient.calendar.id,
        },
      },
    });

    if (totalSend === 0) {
      await this.prisma.notify.create({
        data: {
          title: `Envio de Mensajes Finalizado`,
          message: `Se ha finalizado el envio de mensajes a las ${dayjs().format('HH:mm')} del ${dayjs().format('YYYY-MM-DD')} con la plantilla ${patient.calendar.template.name}`,
          status: 'Finalizado',
          type: 'Mensajes Programados',
          userId: patient.calendar.userId,
          whatsappId: 1
        },
      });

      await this.prisma.calendar.update({
        where: {
          id: patient.calendar.id,
        },
        data: {
          status: 'Finalizado',
        },
      });

      this.whatsappGateway.emitEvent('Notify', 'notify');
    } else {
      this.whatsappGateway.emitEvent('Notify', 'SMessage');
    }

    // console.log(patient);
  }
}
