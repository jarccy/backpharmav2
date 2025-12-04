import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WhatsappGateway } from '../whatsapp/websockets/socket.gateaway';
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

let countries = [
  { id: 1, country: 'Guatemala', timezone: 'America/Guatemala' },
  { id: 2, country: 'Honduras', timezone: 'America/Tegucigalpa' },
  { id: 3, country: 'Panamá', timezone: 'America/Panama' },
  { id: 4, country: 'Nicaragua', timezone: 'America/Managua' },
  { id: 5, country: 'Costa Rica', timezone: 'America/Costa_Rica' },
  { id: 6, country: 'Colombia', timezone: 'America/Bogota' },
  // { id: 7, country: 'Peru', timezone: 'America/Lima'},
];

@Injectable()
export class TaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsappGateway: WhatsappGateway,
  ) { }
  private readonly logger = new Logger(TaskService.name);

  @Cron(CronExpression.EVERY_MINUTE)
  InProgressTask() {
    countries.forEach(async (c) => {
      const localTime = dayjs().tz(c.timezone);
      await this.findTaskCalendar(c.id, localTime.format('YYYY-MM-DD'), localTime.format('HH:mm'));
    });
    this.logger.debug('Search Task all countries');
  }

  async findTaskCalendar(countryId: number, date: string, hour: string) {
    const calendar = await this.prisma.calendar.findFirst({
      where: {
        deleted: false,
        category: 'Programación',
        status: { not: 'Finalizado' },
        startDate: new Date(date),
        timeStart: hour
      },
      select: {
        id: true,
        userId: true,
        _count: {
          select: {
            historySending: true,
          },
        },
        template: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!calendar) {
      return;
    }

    await this.prisma.calendar.update({
      where: { id: calendar.id },
      data: { status: 'En Proceso' },
    });

    await this.prisma.notify.create({
      data: {
        title: `Envio de Mensajes a ${calendar._count.historySending} personas`,
        message: `Se ha iniciado el envio de mensajes a las ${hour} del ${date} con la plantilla ${calendar.template.name}`,
        status: 'En Proceso',
        type: 'Mensajes Programados',
        userId: calendar.userId,
        createdAt: new Date(date + ' ' + hour),
      },
    });

    this.whatsappGateway.emitEvent('Notify', 'notify');
  }
}
