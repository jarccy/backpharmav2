import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { WhatsappGateway } from '../websockets/socket.gateaway';
import { MessageService } from '../services/message.service';
import { Cron, CronExpression } from '@nestjs/schedule';
const dayjs = require('dayjs');

const countries = [
    { id: 1, country: 'Guatemala', timezone: 'America/Guatemala' },
    { id: 2, country: 'Honduras', timezone: 'America/Tegucigalpa' },
    { id: 3, country: 'Panamá', timezone: 'America/Panama' },
    { id: 4, country: 'Nicaragua', timezone: 'America/Managua' },
    { id: 5, country: 'Costa Rica', timezone: 'America/Costa_Rica' },
    { id: 6, country: 'Colombia', timezone: 'America/Bogota' },
];

@Injectable()
export class TaskWhatsappService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly whatsappGateway: WhatsappGateway,
        private readonly messageService: MessageService,
    ) { }

    private logger = new Logger(TaskWhatsappService.name);
    private processingCalendars = new Set<number>()

    @Cron(CronExpression.EVERY_MINUTE)
    // @Cron(CronExpression.EVERY_10_SECONDS)
    async taskMessage() {
        // await Promise.all(countries.map(async (c) => { this.SendTest(c.timezone); }));

        await Promise.all(
            countries.map(async (c) => {
                const localTime = dayjs().tz(c.timezone);
                await this.findPendingAndSendMessages(localTime.format('YYYY-MM-DD'), localTime.format('HH:mm'), c.timezone);
            }),
        );
        this.logger.debug('Search All Countries');
    }

    async findPendingAndSendMessages(date: string, hour: string, timezone: string) {
        const verify = await this.findTaskCalendar(date, hour, timezone);
        if (!verify) { return; }

        await this.SendMessage(timezone);
    }

    async findTaskCalendar(date: string, hour: string, timezone: string): Promise<boolean> {
        const calendar = await this.prisma.calendar.findFirst({
            where: {
                deleted: false,
                category: 'Programación',
                status: { not: 'Finalizado' },
                startDate: new Date(date),
                timeStart: hour,
                countryTime: timezone,
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

        if (!calendar) { return false; }

        await this.prisma.calendar.update({ where: { id: calendar.id }, data: { status: 'En Proceso' }, });

        await this.prisma.notify.create({
            data: {
                title: `Envio de Mensajes a ${calendar._count.historySending} personas`,
                message: `Se ha iniciado el envio de mensajes a las ${hour} del ${date} con la plantilla ${calendar.template.name}`,
                status: 'En Proceso',
                type: 'Mensajes Programados',
                userId: calendar.userId,
                createdAt: new Date(`${date} ${hour}`),
            },
        });

        this.whatsappGateway.emitEvent('Notify', {
            type: 'notify',
            calendarId: calendar.id,
            inProgress: calendar._count.historySending,
            total: calendar._count.historySending
        });

        return true;
    }

    async SendMessage(timezone: string) {
        // Traer todas las personas pendientes del calendario
        const peopleList = await this.prisma.historySending.findMany({
            where: { status: 'Pendiente', calendar: { deleted: false, status: 'En Proceso', countryTime: timezone } },
            select: {
                id: true,
                namePatient: true,
                patientId: true,
                phone: true,
                calendar: {
                    select: {
                        id: true,
                        userId: true,
                        template: {
                            select: {
                                name: true,
                                language: true,
                                componentsSend: true,
                                message: true,
                                file: true,
                            },
                        },
                    },
                },
            },
            orderBy: { calendar: { id: 'asc' } },
        });

        if (!peopleList || peopleList.length === 0) return;

        // Si ya se esta procesando el calendario, no hacer nada
        const calendarId = peopleList[0].calendar.id;
        if (this.processingCalendars.has(calendarId)) { return; }

        // Agregar el calendario a la lista de calendarios en proceso
        this.processingCalendars.add(calendarId);

        // Procesar uno por uno con delay
        for (let i = 0; i < peopleList.length; i++) {
            const person = peopleList[i];
            const localTime = dayjs().tz(timezone);
            const date = localTime.format('YYYY-MM-DD HH:mm:ss');

            const body = {
                number: person.phone,
                userId: person.calendar.userId,
                name: person.namePatient,
                message: person.calendar.template.message,
                mediaUrl: person.calendar.template.file,
                file: person.calendar.template.file,
                peopleId: +person.patientId,
                createdAt: date,
                template: {
                    name: person.calendar.template.name,
                    language: person.calendar.template.language,
                    componentsSend: person.calendar.template.componentsSend,
                },
            };

            const response = await this.messageService.sendCalendarMessage(body);
            console.log('Task ', response);

            // Actualizar el estado del envio
            const statusProcess = response ? 'Enviado' : 'No Enviado';
            await this.prisma.historySending.update({ where: { id: person.id }, data: { status: statusProcess } });

            // Si es el último de la lista, cerrar el calendario y notificar
            if (i === peopleList.length - 1) {
                await this.prisma.notify.create({
                    data: {
                        title: `Envio de Mensajes Finalizado`,
                        message: `Se ha finalizado el envio de mensajes a las ${dayjs().format('HH:mm')} del ${dayjs().format('YYYY-MM-DD')} con la plantilla ${person.calendar.template.name}`,
                        status: 'Finalizado',
                        type: 'Mensajes Programados',
                        userId: person.calendar.userId,
                    },
                });

                await this.prisma.calendar.update({ where: { id: person.calendar.id }, data: { status: 'Finalizado' }, });

                this.whatsappGateway.emitEvent('Notify', {
                    type: 'notify',
                    calendarId: calendarId,
                    inProgress: peopleList.length,
                    total: peopleList.length
                });
                this.processingCalendars.delete(calendarId);
            } else {
                this.whatsappGateway.emitEvent('Notify', {
                    type: 'SMessage',
                    calendarId: calendarId,
                    inProgress: i,
                    total: peopleList.length
                });
            }

            // Esperar 10 segundos antes de enviar al siguiente
            if (i < peopleList.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 10000));
            }
        }
    }

    async SendTest(timezone: string) {
        const localTime = dayjs().tz(timezone);
        const minuteNumber = localTime.minute();

        if (this.processingCalendars.has(minuteNumber)) {
            console.log('exists', minuteNumber);
            return;
        }
        this.processingCalendars.add(minuteNumber);
        console.log('not exists', minuteNumber);

        let total = 5;

        for (let i = 1; i <= total; i++) {
            this.whatsappGateway.emitEvent('Notify', {
                type: 'SMessage',
                calendarId: minuteNumber,
                inProgress: i,
                total
            });
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }

        this.processingCalendars.delete(minuteNumber);
        this.whatsappGateway.emitEvent('Notify', {
            type: 'notify',
            calendarId: minuteNumber,
            inProgress: total,
            total
        });
    }

}

// {
//   id: 'wamid.HBgUNTE5NDc3NDUzNzU1MTk0Nzc0NTMVAgARGBI5NjE3RUQ5QkU5NTQyNTVEMDgA',
//   status: 'failed',
//   timestamp: '1767149914',
//   recipient_id: '51947745375519477453',
//   errors: [
//     {
//       code: 131026,
//       title: 'Message undeliverable',
//       message: 'Message undeliverable',
//       error_data: [Object]
//     }
//   ]
// }


//  async SendMessage(timezone: string) {
//         const people = await this.prisma.historySending.findFirst({
//             where: { status: 'Pendiente', calendar: { deleted: false, status: 'En Proceso', countryTime: timezone } },
//             select: {
//                 id: true,
//                 namePatient: true,
//                 patientId: true,
//                 phone: true,
//                 calendar: {
//                     select: {
//                         id: true,
//                         userId: true,
//                         template: {
//                             select: {
//                                 name: true,
//                                 language: true,
//                                 componentsSend: true,
//                                 message: true,
//                                 file: true,
//                             },
//                         },
//                     },
//                 },
//             },
//             orderBy: { calendar: { id: 'asc' } },
//         });

//         if (!people) { return; }

//         const localTime = dayjs().tz(timezone);
//         const date = localTime.format('YYYY-MM-DD HH:mm:ss');

//         let body = {
//             number: people.phone,
//             userId: people.calendar.userId,
//             name: people.namePatient,
//             message: people.calendar.template.message,
//             mediaUrl: people.calendar.template.file,
//             file: people.calendar.template.file,
//             peopleId: +people.patientId,
//             createdAt: date,
//             template: {
//                 name: people.calendar.template.name,
//                 language: people.calendar.template.language,
//                 componentsSend: people.calendar.template.componentsSend,
//             },
//         };

//         const response = await this.messageService.sendCalendarMessage(body);

//         console.log('Task ', response);

//         let statusProcess = 'Enviado';
//         if (!response) { statusProcess = 'No Enviado'; }

//         await this.prisma.historySending.update({ where: { id: people.id }, data: { status: statusProcess } });

//         const totalSend = await this.prisma.historySending.count({
//             where: { status: 'Pendiente', calendar: { deleted: false, status: 'En Proceso', id: people.calendar.id } },
//         });

//         if (totalSend === 0) {
//             await this.prisma.notify.create({
//                 data: {
//                     title: `Envio de Mensajes Finalizado`,
//                     message: `Se ha finalizado el envio de mensajes a las ${dayjs().format('HH:mm')} del ${dayjs().format('YYYY-MM-DD')} con la plantilla ${people.calendar.template.name}`,
//                     status: 'Finalizado',
//                     type: 'Mensajes Programados',
//                     userId: people.calendar.userId,
//                 },
//             });

//             await this.prisma.calendar.update({ where: { id: people.calendar.id }, data: { status: 'Finalizado' } });

//             this.whatsappGateway.emitEvent('Notify', 'notify');
//         } else {
//             this.whatsappGateway.emitEvent('Notify', 'SMessage');
//         }
//     }