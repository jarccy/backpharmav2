// import { Injectable, Logger } from '@nestjs/common';
// import { PrismaService } from '../../prisma.service';
// import { Cron, CronExpression } from '@nestjs/schedule';
// import { WhatsappGateway } from '../websockets/socket.gateaway';
// import * as dayjs from 'dayjs';
// import * as utc from 'dayjs/plugin/utc';
// import * as timezone from 'dayjs/plugin/timezone';

// dayjs.extend(utc);
// dayjs.extend(timezone);

// const countries = [
//   { id: 1, country: 'Guatemala', timezone: 'America/Guatemala' },
//   { id: 2, country: 'Honduras', timezone: 'America/Tegucigalpa' },
//   { id: 3, country: 'Panamá', timezone: 'America/Panama' },
//   { id: 4, country: 'Nicaragua', timezone: 'America/Managua' },
//   { id: 5, country: 'Costa Rica', timezone: 'America/Costa_Rica' },
//   { id: 6, country: 'Colombia', timezone: 'America/Bogota' },
// ];

// @Injectable()
// export class TaskService {
//   constructor(
//     private readonly prisma: PrismaService,
//     private readonly whatsappGateway: WhatsappGateway,
//   ) { }
//   private readonly logger = new Logger(TaskService.name);

//   @Cron(CronExpression.EVERY_MINUTE)
//   async InProgressTask() {
//     await Promise.all(
//       countries.map(async (c) => {
//         const localTime = dayjs().tz(c.timezone);
//         await this.findTaskCalendar(localTime.format('YYYY-MM-DD'), localTime.format('HH:mm'), c.timezone);
//       }),
//     );
//     this.logger.debug('Search Task all countries');
//   }

//   async findTaskCalendar(date: string, hour: string, timezone: string): Promise<boolean> {
//     const calendar = await this.prisma.calendar.findFirst({
//       where: {
//         deleted: false,
//         category: 'Programación',
//         status: { not: 'Finalizado' },
//         startDate: new Date(date),
//         timeStart: hour,
//         countryTime: timezone,
//       },
//       select: {
//         id: true,
//         userId: true,
//         _count: {
//           select: {
//             historySending: true,
//           },
//         },
//         template: {
//           select: {
//             name: true,
//           },
//         },
//       },
//     });

//     if (!calendar) { return false; }

//     await this.prisma.calendar.update({ where: { id: calendar.id }, data: { status: 'En Proceso' }, });

//     await this.prisma.notify.create({
//       data: {
//         title: `Envio de Mensajes a ${calendar._count.historySending} personas`,
//         message: `Se ha iniciado el envio de mensajes a las ${hour} del ${date} con la plantilla ${calendar.template.name}`,
//         status: 'En Proceso',
//         type: 'Mensajes Programados',
//         userId: calendar.userId,
//         createdAt: new Date(`${date} ${hour}`),
//       },
//     });

//     this.whatsappGateway.emitEvent('Notify', {
//       type: 'notify',
//       calendarId: calendar.id,
//       inProgress: calendar._count.historySending,
//       total: calendar._count.historySending
//     });

//     return true;
//   }
// }
