import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma.service';
import { Contact, storeDetailsContact, getDetailsContact } from '../dto/contact.dto';

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
        entityId: undefined,
        pdvId: undefined,
        status: true,
        createdAt: new Date(),
      } as any,
    });

    return newId;
  }

  async getContactByNumber(phone: string) {
    const peopleId = await this.prisma.people.findFirst({
      where: { phone },
    });
    if (!peopleId) {
      return null;
    }
    return peopleId.id;
  }

  //details contact
  async getDetailsContact(data: getDetailsContact) {
    return this.prisma.detailsContact.findFirst({
      where: { contactId: +data.contactId, number: data.number },
    });
  }

  async createDetailsContact(data: storeDetailsContact) {
    await this.prisma.detailsContact.create({ data: { ...data } });
    return true;
  }

  async updateDetailsContact(id: number, data: storeDetailsContact) {
    await this.prisma.detailsContact.update({
      where: { id },
      data: { ...data },
    });

    return true;
  }
}
