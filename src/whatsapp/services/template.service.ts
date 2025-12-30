import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { GetDTO } from '../../common/dto/params-dto';
import { createTemplate } from '../dto/templates.dto';
import { diskStorage, StorageEngine } from 'multer';

@Injectable()
export class TemplateService {
  constructor(private prisma: PrismaService) { }

  async getTemplates(dto: GetDTO) {
    const { search } = dto;

    const data = await this.prisma.templates.findMany({
      select: {
        id: true,
        metaTemplateId: true,
        metaName: true,
        language: true,
        name: true,
        category: true,
        subCategory: true,
        components: true,
        componentsSend: true,
        message: true,
        contentType: true,
        file: true,
        status: true,
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

    const response = data.map((item) => ({
      ...item,
      components: item.components ? JSON.parse(item.components) : [],
      componentsSend: item.componentsSend ? JSON.parse(item.componentsSend) : [],
    }));

    return response;
  }

  async createTemplate(data: createTemplate, user: number, url: string) {
    await this.prisma.templates.create({
      data: {
        ...data,
        userId: user,
        contentType: data.contentType,
        file: data.file,
      },
    });
    return 'Plantilla registrado exitosamente';
  }

  async updateTemplate(id: number, data: createTemplate, user: number, url: string) {
    await this.prisma.templates.update({
      where: { id },
      data: {
        ...data,
        userId: user,
        contentType: data.contentType,
        file: data.file,
      },
    });

    return 'Plantilla actualizado exitosamente';
  }

  async syncTemplates(data: createTemplate, user: number) {
    const veryfyMetaId = await this.prisma.templates.findFirst({
      where: {
        metaTemplateId: data.metaTemplateId,
      },
    });
    if (veryfyMetaId) {
      console.log('Plantilla ya existe');
      return true;
    }

    await this.prisma.templates.create({
      data: {
        ...data,
        userId: user,
        contentType: data.contentType,
        file: data.file,
      },
    });

    return true;
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
