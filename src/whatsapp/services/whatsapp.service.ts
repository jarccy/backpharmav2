import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Whatsapp } from '../dto/whatsapp.dto';
// import { GetDTO } from '../../common/dto/params-dto';

@Injectable()
export class WhatsappService {
  constructor(private prisma: PrismaService) { }

  async getWhatsapps() {
    return this.prisma.whatsapps.findMany();
  }

  async whatsappList() {
    const response = await this.prisma.whatsapps.findMany({
      select: {
        id: true,
        status: true,
        name: true
      }
    });

    const result = response.map((whatsapp) => ({
      value: whatsapp.id,
      label: whatsapp.name,
      status: whatsapp.status,
      style: {
        color: whatsapp.status === 'Conectado' ? 'green' : 'red'
      }
    }));

    return result;
  }

  async createWhatsapp(data: Whatsapp) {
    const wsId = await this.prisma.whatsapps.create({
      data: { ...data, status: 'Desconectado' },
    });

    // initWbot(wsId, this.whatsappGateway);

    return 'Whatsapp registrado exitosamente';
  }

  async updateWhatsapp(id: number, data: Whatsapp,) {
    const existingWhatsapp = await this.prisma.whatsapps.findFirst()

    if (existingWhatsapp) {
      await this.prisma.whatsapps.update({
        where: { id },
        data,
      });
    }

    return 'Whatsapp actualizado exitosamente';
  }

  async updateStatusWhatsapp(id: number, status: string) {
    await this.prisma.whatsapps.update({
      where: { id },
      data: { status },
    });
    return 'Estado actualizado exitosamente';
  }

  async disconectWhatsapp(id: number) {
    await this.updateStatusWhatsapp(id, 'Desconectado');

    return 'Whatsapp desconectado exitosamente';
  }
}
