import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { GetDTO } from '../../common/dto/params-dto';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { StoreCompanyDto } from './dto/store-company.dto';
const dayjs = require('dayjs');

@Injectable()
export class CompanyService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(dto: GetDTO) {
    const {
      search,
      perPage,
      page,
      country,
      city,
      department,
      startDate,
      endDate,
    } = dto;

    const where: Prisma.entityWhereInput = {
      ...(country && country != 0 && { country: country.toString() }),
      ...(department && { department: department }),
      ...(city && { city: city }),
      ...(startDate && endDate
        ? {
          companyStartDate: {
            gte: new Date(startDate),
            lte: new Date(`${endDate}`),
          },
        }
        : startDate
          ? {
            companyStartDate: {
              gte: new Date(startDate),
              lte: new Date(`${startDate}`),
            },
          }
          : {}),
      ...(search && {
        socialReason: { contains: search },
      }),
    };

    const query = await this.prisma.entity.findMany({
      select: {
        id: true,
        socialReason: true,
        legalRep: true,
        peopleType: true,
        fiscalDoc: true,
        matricula: true,
        adminAddress: true,
        adminPhone: true,
        adminEmail: true,
        country: true,
        department: true,
        city: true,
      },
      where,
      skip: (+page - 1) * +perPage,
      take: +perPage,
      orderBy: { id: 'desc' },
    });

    const total = await this.prisma.entity.count({ where });
    const last_page = Math.ceil(total / parseInt(perPage));

    return {
      data: query,
      total,
      last_page,
    };
  }

  async getCompanyById(id: number) {
    const query = await this.prisma.entity.findFirst({
      where: { id },
      include: { users: { select: { name: true } } },
    })

    return {
      data: query,
    };
  }

  async createCompany(user: number, dto: StoreCompanyDto) {
    const { users, ...rest } = dto;

    if (dto.fiscalDoc) {
      const verifyDoc = await this.prisma.entity.findFirst({
        where: { fiscalDoc: dto.fiscalDoc.trim() },
      });
      if (verifyDoc) {
        return { error: 'El Documento fiscal ya existe' };
      }
    }

    if (dto.adminPhone) {
      const verifyPhone = await this.prisma.entity.findFirst({
        where: { adminPhone: dto.adminPhone.trim() },
      });
      if (verifyPhone) {
        return { error: 'El número de teléfono ya existe' };
      }
    }

    const lastId = await this.prisma.entity.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    const newId = lastId?.id ? lastId.id + 1 : 1;

    await this.prisma.entity.create({
      data: {
        ...rest, id: newId, validatedBy: user, validationDate: dto.validationDate ? new Date(dto.validationDate) : null,
        companyStartDate: dto.companyStartDate ? new Date(dto.companyStartDate) : null, companyEndDate: dto.companyEndDate ? new Date(dto.companyEndDate) : null
      },
    });

    return 'Entidad creada correctamente';
  }

  async updateCompany(user: number, id: number, dto: UpdateCompanyDto) {
    const { users, ...rest } = dto;

    if (dto.fiscalDoc) {
      const verifyDoc = await this.prisma.entity.findFirst({
        where: { fiscalDoc: dto.fiscalDoc.trim(), NOT: { id: id } },
      });
      if (verifyDoc) {
        return { error: 'El Documento fiscal ya existe' };
      }
    }

    if (dto.adminPhone) {
      const verifyPhone = await this.prisma.entity.findFirst({
        where: { adminPhone: dto.adminPhone.trim(), NOT: { id: id } },
      });
      if (verifyPhone) {
        return { error: 'El número de teléfono ya existe' };
      }
    }

    await this.prisma.entity.update({
      where: { id },
      data: {
        ...rest, validatedBy: user, validationDate: dto.validationDate ? new Date(dto.validationDate) : null,
        companyStartDate: dto.companyStartDate ? new Date(dto.companyStartDate) : null, companyEndDate: dto.companyEndDate ? new Date(dto.companyEndDate) : null
      },
    });

    return 'Entidad actualizada correctamente';
  }

  async getAllCompanys(dto: GetDTO) {
    const {
      search,
      country,
      city,
      department,
      startDate,
      endDate,
    } = dto;

    const where: Prisma.entityWhereInput = {
      ...(country && country != 0 && { country: country.toString() }),
      ...(department && { department: department }),
      ...(city && { city: city }),
      ...(startDate && endDate
        ? {
          companyStartDate: {
            gte: new Date(startDate),
            lte: new Date(`${endDate}`),
          },
        }
        : startDate
          ? {
            companyStartDate: {
              gte: new Date(startDate),
              lte: new Date(`${startDate}`),
            },
          }
          : {}),
      ...(search && {
        socialReason: { contains: search },
      }),
    };

    const query = await this.prisma.entity.findMany({ where })

    return query;
  }

  async exportToExcel(dto: GetDTO) {
    const companies = await this.getAllCompanys(dto);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Entidades');

    worksheet.columns = [
      { header: 'RAZON_SOCIAL', key: 'socialReason', width: 40 },
      { header: 'TIPO_PERSONA', key: 'peopleType', width: 20 },
      { header: 'DOCUMENTO_FISCAL', key: 'fiscalDoc', width: 20 },
      { header: 'MATRICULA', key: 'matricula', width: 20 },
      { header: 'PAIS', key: 'country', width: 20 },
      { header: 'DEPARTAMENTO', key: 'department', width: 20 },
      { header: 'CIUDAD', key: 'city', width: 20 },
      { header: 'DIRECCION_ADMIN', key: 'adminAddress', width: 30 },
      { header: 'TELEFONO_ADMIN', key: 'adminPhone', width: 20 },
      { header: 'CORREO_ADMIN', key: 'adminEmail', width: 30 },
      { header: 'ES_CADENA', key: 'isChain', width: 20 },
      { header: 'NRO_PDV', key: 'pdvNumber', width: 15 },
      { header: 'CATEGORIA_VENTAS', key: 'salesCat', width: 20 },
      { header: 'ESTADO_RAZON_SOCIAL', key: 'socialState', width: 20 },
      { header: 'MOTIVO_ESTADO', key: 'stateReason', width: 30 },
      { header: 'REPRESENTANTE_LEGAL', key: 'legalRep', width: 30 },
      { header: 'DOC_REPRESENTANTE', key: 'legalDoc', width: 20 },
      { header: 'CARGO_REPRESENTANTE', key: 'legalRole', width: 20 },
      { header: 'CORREO_REPRESENTANTE', key: 'legalEmail', width: 30 },
      { header: 'TELEFONO_REPRESENTANTE', key: 'legalPhone', width: 20 },
      { header: 'DOCUMENTACION', key: 'documentation', width: 30 },
      { header: 'OBSERVACIONES', key: 'observations', width: 30 },
      { header: 'ESTADO_VALIDACION', key: 'validationState', width: 20 },
      { header: 'NIVEL_CONFIANZA', key: 'confidenceLevel', width: 20 },
      { header: 'DOC_FISCAL_VERIFICADO', key: 'fiscalVerified', width: 20 },
      { header: 'CORREO_VERIFICADO', key: 'emailVerified', width: 20 },
      { header: 'TELEFONO_VERIFICADO', key: 'phoneVerified', width: 20 },
      { header: 'VALIDADO_POR', key: 'validatedBy', width: 15 },
      { header: 'FECHA_VALIDACION', key: 'validationDate', width: 20 },
      { header: 'SUS_EMPRESA_ESTADO', key: 'companyState', width: 20 },
      { header: 'SUS_EMPRESA_PLAN', key: 'companyPlan', width: 20 },
      { header: 'SUS_EMPRESA_FECHA_INICIO', key: 'companyStartDate', width: 20 },
      { header: 'SUS_EMPRESA_FECHA_FIN', key: 'companyEndDate', width: 20 },
      { header: 'SUS_EMPRESA_RENOV_AUTO', key: 'autoRenewal', width: 20 },

    ];

    companies.forEach((v) => {
      worksheet.addRow({
        ...v,
        validationDate: v.validationDate ? dayjs(v.validationDate).format('YYYY-MM-DD') : '',
        companyStartDate: v.companyStartDate ? dayjs(v.companyStartDate).format('YYYY-MM-DD') : '',
        companyEndDate: v.companyEndDate ? dayjs(v.companyEndDate).format('YYYY-MM-DD') : '',
      });
    });

    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }
}
