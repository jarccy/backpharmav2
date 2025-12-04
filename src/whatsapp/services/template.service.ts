import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { GetDTO } from '../../common/dto/params-dto';
import { Template } from '../dto/templates.dto';
import { diskStorage, StorageEngine } from 'multer';

@Injectable()
export class TemplateService {
  constructor(private prisma: PrismaService) { }

  async getTemplates(dto: GetDTO) {
    const { search } = dto;

    const data = await this.prisma.templates.findMany({
      select: {
        id: true,
        name: true,
        message: true,
        type: true,
        contentType: true,
        file: true,
        createdAt: true,
        updatedAt: true,
      },
      where: search
        ? {
          OR: [
            {
              name: {
                contains: search,
              },
            },
            {
              message: {
                contains: search,
              },
            },
          ],
        }
        : {},
    });

    return data;
  }

  async createTemplate(data: Template, user: number, url: string) {
    await this.prisma.templates.create({
      data: {
        ...data,
        userId: user,
        contentType: parseInt(data.contentType),
        type: parseInt(data.type),
        file: url,
      },
    });
    return 'Plantilla registrado exitosamente';
  }

  async updateTemplate(id: number, data: Template, user: number, url: string) {
    await this.prisma.templates.update({
      where: { id },
      data: {
        ...data,
        userId: user,
        contentType: parseInt(data.contentType),
        type: parseInt(data.type),
        file: url ?? undefined,
      },
    });

    return 'Plantilla actualizado exitosamente';
  }

  getStorageEngine(destinationPath: string): StorageEngine {
    return diskStorage({
      destination: destinationPath,
      filename: (req, file, callback) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const originalName = file.originalname.replace(/\s/g, '_');
        callback(null, `${uniqueSuffix}-${originalName}`);
      },
    });
  }

  async getTemplatesType(dto: GetDTO) {
    const { search } = dto;

    const data = await this.prisma.templates.findMany({
      select: {
        id: true,
        name: true,
      },
      where: search
        ? {
          type: {
            equals: parseInt(search),
          },
        }
        : {},
    });

    return data.map((template) => ({
      value: template.id,
      label: template.name,
    }));
  }

  async getTemplatebyId(id: number) {
    const message = await this.prisma.templates.findFirst({
      select: {
        message: true,
        contentType: true,
        file: true,
      },
      where: {
        id,
      },
    });
    return message;
  }
}
