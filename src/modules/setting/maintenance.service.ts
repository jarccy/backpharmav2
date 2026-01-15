import { Injectable } from '@nestjs/common';
import { CreateChildDto } from './dto/create-child.dto';
import { PrismaService } from '../../prisma.service';
import { GetDTO } from '../../common/dto/params-dto';
import { Prisma } from '@prisma/client';
import { CreateParentDto } from './dto/create-parent.dto';

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) { }

  async findAllChilds(dto: GetDTO) {
    const { search, perPage, page } = dto;

    const query = await this.prisma.option.findMany({
      select: {
        id: true,
        groupList: { select: { name: true } },
        groupId: true,
        value: true,
        status: true,
      },
      orderBy: {
        value: 'asc',
      },
      where: { ...(search && { value: { contains: search } }) },
      skip: (parseInt(page) - 1) * parseInt(perPage),
      take: parseInt(perPage),
    });

    const data = query.map((row) => ({
      id: row.id,
      maintenanceId: row.groupId,
      category: row.groupList.name,
      description: row.value,
      status: row.status,
    }));

    const total = await this.prisma.option.count({
      where: { ...(search && { value: { contains: search } }) },
    });

    const last_page = Math.ceil(total / parseInt(perPage));

    return { data, total: total, last_page: last_page };
  }

  async createChild(dto: CreateChildDto) {
    const lastOption = await this.prisma.option.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    const newId = lastOption?.id ? lastOption.id + 1 : 1;

    const newChild = await this.prisma.option.create({
      data: {
        id: newId,
        groupId: dto.maintenanceId,
        value: dto.description,
        status: dto.status,
      },
    });

    return `Child with ID ${newChild.id} created successfully`;
  }

  async updateChild(id: number, dto: CreateChildDto) {
    const updatedChild = await this.prisma.option.updateMany({
      where: {
        id,
        groupId: dto.maintenanceId,
      },
      data: {
        value: dto.description,
        status: dto.status,
      },
    });

    if (updatedChild.count === 0) {
      throw new Error('No matching child found to update');
    }

    return `Child with ID ${id} updated successfully`;
  }

  async findAllParents() {
    const query = await this.prisma.group.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'desc',
      },
    });

    const data = query.map((row) => ({
      value: row.id,
      label: row.name,
    }));


    return data;
  }

  async createParent(dto: CreateParentDto) {
    const lastGroup = await this.prisma.group.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    const newId = lastGroup?.id ? lastGroup.id + 1 : 1;

    const newGroup = await this.prisma.group.create({
      data: {
        id: newId,
        name: dto.description,
        status: true,
      },
    });

    return {
      value: newGroup.id,
      label: newGroup.name,
    };
  }

  async updateParent(id: number, dto: CreateParentDto) {
    const updatedGroup = await this.prisma.group.update({
      where: { id },
      data: {
        name: dto.description,
        status: true,
      },
    });

    return {
      value: updatedGroup.id,
      label: updatedGroup.name,
    };
  }
}
