import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Cron } from '@nestjs/schedule';
import { WhatsappGateway } from '../websockets/socket.gateaway';
import { MessageService } from '../services/message.service';
import { ContactService } from './contact.service';
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
        private readonly contactService: ContactService,
    ) { }

    @Cron('*/5 * * * * *')
    async taskMessage() {
        await Promise.all(
            countries.map(async (c) => {
                const localTime = dayjs().tz(c.timezone);
                // console.log(localTime.format('YYYY-MM-DD HH:mm:ss'), c.country);
                this.SendMessage(localTime.format('YYYY-MM-DD HH:mm:ss'), c.timezone);
            }),
        );
    }

    async SendMessage(date: string, timezone: string) {
        // this.whatsappGateway.emitEvent('test', dayjs().format('HH:mm:ss DD/MM/YYYY'));

        const people = await this.prisma.historySending.findFirst({
            where: {
                status: 'Pendiente',
                calendar: {
                    deleted: false,
                    status: 'En Proceso',
                    countryTime: timezone
                },
            },
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

        if (!people) { return; }


        let body = {
            number: people.phone,
            userId: people.calendar.userId,
            name: people.namePatient,
            message: people.calendar.template.message,
            componentsSend: people.calendar.template.componentsSend,
            mediaUrl: people.calendar.template.file,
            peopleId: +people.patientId,

            createdAt: date,
            template: {
                name: people.calendar.template.name,
                language: people.calendar.template.language,
                componentsSend: people.calendar.template.componentsSend,
                message: people.calendar.template.message,
                file: people.calendar.template.file,
            },
        };

        // console.log(body);


        // const response = await this.messageService.sendCalendarMessage(body);

        // console.log('Task ', response);

        // let statusProcess = 'Enviado';
        // if (!response) {
        //     statusProcess = 'No Enviado';
        // }

        // await this.prisma.historySending.update({
        //     where: {
        //         id: people.id,
        //     },
        //     data: {
        //         status: statusProcess,
        //     },
        // });

        const totalSend = await this.prisma.historySending.count({
            where: {
                status: 'Pendiente',
                calendar: {
                    deleted: false,
                    status: 'En Proceso',
                    id: people.calendar.id,
                },
            },
        });

        if (totalSend === 0) {
            await this.prisma.notify.create({
                data: {
                    title: `Envio de Mensajes Finalizado`,
                    message: `Se ha finalizado el envio de mensajes a las ${dayjs().format('HH:mm')} del ${dayjs().format('YYYY-MM-DD')} con la plantilla ${people.calendar.template.name}`,
                    status: 'Finalizado',
                    type: 'Mensajes Programados',
                    userId: people.calendar.userId,
                },
            });

            await this.prisma.calendar.update({
                where: {
                    id: people.calendar.id,
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