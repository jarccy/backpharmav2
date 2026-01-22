import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { WhatsappGateway } from '../websockets/socket.gateaway';
import { MessageService } from './message.service';
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
                title: true,
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
            title: calendar.title,
            inProgress: 0,
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
                        title: true,
                        userId: true,
                        template: {
                            select: {
                                name: true,
                                metaName: true,
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

        try {
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
                        name: person.calendar.template.metaName,
                        language: person.calendar.template.language,
                        componentsSend: person.calendar.template.componentsSend,
                    },
                };

                const response = await this.messageService.sendCalendarMessage(body);
                // console.log('Task ', response);

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
                        title: person.calendar.title,
                        inProgress: peopleList.length,
                        total: peopleList.length
                    });
                    this.processingCalendars.delete(calendarId);
                } else {
                    this.whatsappGateway.emitEvent('Notify', {
                        type: 'SMessage',
                        calendarId: calendarId,
                        title: person.calendar.title,
                        inProgress: i + 1,
                        total: peopleList.length
                    });
                }

                // Esperar 10 segundos antes de enviar al siguiente
                if (i < peopleList.length - 1) {
                    await new Promise((resolve) => setTimeout(resolve, 5000));
                }
            }
        } catch (error) {
            await this.prisma.notify.create({
                data: {
                    title: `Error en Envio de Mensajes`,
                    message: error.message,
                    status: 'Error',
                    type: 'Mensajes Programados',
                    userId: 1,
                },
            });
            this.logger.debug('Error en Envio de Mensajes');
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