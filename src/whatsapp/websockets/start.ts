import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConnectionService } from '../services/connection.service';
import { initWbot } from '../example/wsessions';
import { WhatsappGateway } from './socket.gateaway';

@Injectable()
export class WsStartService implements OnModuleInit {
    private readonly logger = new Logger(WsStartService.name);

    constructor(
        private readonly connectionService: ConnectionService,
        private readonly whatsappGateway: WhatsappGateway
    ) { }

    async onModuleInit() {
        this.initClient();
    }

    private async initClient() {
        const listWhatsapps = await this.connectionService.getWhatsapps();

        await Promise.allSettled(
            listWhatsapps.map(async (whatsapp) => {
                try {
                    await initWbot(whatsapp, this.whatsappGateway);
                    this.logger.log(`Sesión ${whatsapp.name} inicializada correctamente`);
                } catch (err) {
                    this.logger.error(`Error al iniciar ${whatsapp.name}`, err);
                }
            }),
        );
        this.logger.log('Todas las sesiones procesadas.');
    }
}

