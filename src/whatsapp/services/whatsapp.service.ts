import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Whatsapp } from '../dto/whatsapp.dto';

@Injectable()
export class WhatsappService {
  constructor(private prisma: PrismaService) { }

  async getWhatsapps() {
    return this.prisma.whatsapps.findMany();
  }

  async createWhatsapp(data: Whatsapp) {
    await this.prisma.whatsapps.create({
      data: { ...data },
    });

    return 'Whatsapp registrado exitosamente';
  }

  async updateWhatsapp(id: number, data: Whatsapp,) {
    await this.prisma.whatsapps.update({
      where: { id },
      data: { ...data },
    });

    return 'Whatsapp actualizado exitosamente';
  }
}
