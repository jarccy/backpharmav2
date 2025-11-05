import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Contact } from '../dto/contact.dto';

@Injectable()
export class ContactService {
  constructor(private prisma: PrismaService) { }

  async getContacts() {
    return this.prisma.people.findMany({
      distinct: ['phone'],
    });
  }

  async create(data: Contact) {
    const lastId = await this.prisma.people.findFirst({
      orderBy: { id: 'desc' }, select: { id: true }
    });

    const newId = lastId?.id ? lastId.id + 1 : 1;
    await this.prisma.people.create({ data: { ...data, id: newId } });

    const lastIdRelation = await this.prisma.relationPdv.findFirst({
      orderBy: { id: 'desc' }, select: { id: true }
    });

    const newIdRelation = lastIdRelation?.id ? lastIdRelation.id + 1 : 1;

    await this.prisma.relationPdv.create({
      data: {
        id: newIdRelation,
        peopleId: newId,
        entityId: null,
        pdvId: null,
        status: null,
        createdAt: new Date(),
      } as any,
    });

    return newId;
  }

  async getContactByNumber(phone: string) {
    const contactId = await this.prisma.people.findFirst({
      where: { phone },
    });
    if (!contactId) {
      return null;
    }
    return contactId.id;
  }
}
