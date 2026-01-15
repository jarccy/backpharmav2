import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { GetDTO } from '../../common/dto/params-dto';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { StoreBranchDto } from './dto/store-branch.dto';
const dayjs = require('dayjs');

@Injectable()
export class BranchService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(dto: GetDTO) {
    const {
      search,
      perPage,
      page,
      country,
      department,
      city,
      startDate,
      endDate,
    } = dto;

    const where: Prisma.pointSaleWhereInput = {
      ...(country && country != 0 && { countryId: Number(country) }),
      ...(department && { department: department }),
      ...(city && { city: city }),
      ...(startDate && endDate
        ? {
          pointSaleStartDate: {
            gte: new Date(startDate),
            lte: new Date(`${endDate}`),
          },
        }
        : startDate
          ? {
            pointSaleStartDate: {
              gte: new Date(startDate),
              lte: new Date(`${startDate}`),
            },
          }
          : {}),
      ...(search && {
        name: { contains: search },
      }),
    };

    const query = await this.prisma.pointSale.findMany({
      select: {
        id: true,
        name: true,
        chainName: true,
        type: true,
        address: true,
        department: true,
        city: true,
        email: true,
        phone: true,
        country: { select: { name: true } },
        entity: { select: { socialReason: true } },
      },
      where,
      skip: (+page - 1) * +perPage,
      take: +perPage,
      orderBy: { id: 'desc' },
    });

    const data = query.map(person => ({
      ...person,
      country: person.country?.name || null,
      entity: person.entity?.socialReason || null,
    }));

    const total = await this.prisma.pointSale.count({ where });
    const last_page = Math.ceil(total / parseInt(perPage));

    return {
      data: data,
      total,
      last_page,
    };
  }

  async getBranchById(id: number) {
    const query = await this.prisma.pointSale.findFirst({
      where: { id },
      include: { users: { select: { name: true } } },
    })

    return {
      data: query,
    };
  }

  async createBranch(user: number, dto: StoreBranchDto) {
    const { users, ...rest } = dto;

    if (dto.name) {
      const verifyName = await this.prisma.pointSale.findFirst({
        where: { name: dto.name.trim() },
      });

      if (verifyName) {
        return { error: 'El Nombre Farmacia ya existe' };
      }
    }

    if (dto.phone) {
      const verifyPhone = await this.prisma.pointSale.findFirst({
        where: { phone: dto.phone.trim() },
      });

      if (verifyPhone) {
        return { error: 'El número de teléfono ya existe' };
      }
    }

    const lastId = await this.prisma.pointSale.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    const newId = lastId?.id ? lastId.id + 1 : 1;

    await this.prisma.pointSale.create({
      data: {
        ...rest, id: newId, validatedBy: user, validationDate: dto.validationDate ? new Date(dto.validationDate) : null,
        pointSaleStartDate: dto.pointSaleStartDate ? new Date(dto.pointSaleStartDate) : null, pointSaleEndDate: dto.pointSaleEndDate ? new Date(dto.pointSaleEndDate) : null
      },
    });

    // console.log(query);

    return 'Punto de Venta creado correctamente';
  }

  async updateBranch(user: number, id: number, dto: UpdateBranchDto) {
    const { users, ...rest } = dto;

    if (dto.name) {
      const verifyName = await this.prisma.pointSale.findFirst({
        where: { name: dto.name.trim(), NOT: { id: id } },
      });

      if (verifyName) {
        return { error: 'El Nombre Farmacia ya existe' };
      }
    }

    if (dto.phone) {
      const verifyPhone = await this.prisma.pointSale.findFirst({
        where: { phone: dto.phone.trim(), NOT: { id: id } },
      });

      if (verifyPhone) {
        return { error: 'El número de teléfono ya existe' };
      }
    }

    await this.prisma.pointSale.update({
      where: { id },
      data: {
        ...rest, validatedBy: user, validationDate: dto.validationDate ? new Date(dto.validationDate) : null,
        pointSaleStartDate: dto.pointSaleStartDate ? new Date(dto.pointSaleStartDate) : null, pointSaleEndDate: dto.pointSaleEndDate ? new Date(dto.pointSaleEndDate) : null
      },
    });

    return 'Punto de Venta actualizado correctamente';
  }

  async getAllBranchs(dto: GetDTO) {
    const {
      search,
      country,
      department,
      city,
      startDate,
      endDate,
    } = dto;

    const where: Prisma.pointSaleWhereInput = {
      ...(country && country != 0 && { countryId: Number(country) }),
      ...(department && { department: department }),
      ...(city && { city: city }),
      ...(startDate && endDate
        ? {
          pointSaleStartDate: {
            gte: new Date(startDate),
            lte: new Date(`${endDate}`),
          },
        }
        : startDate
          ? {
            pointSaleStartDate: {
              gte: new Date(startDate),
              lte: new Date(`${startDate}`),
            },
          }
          : {}),
      ...(search && {
        name: { contains: search },
      }),
    };

    const query = await this.prisma.pointSale.findMany({ where })

    return query;
  }

  async exportToExcel(dto: GetDTO) {
    const branchs = await this.getAllBranchs(dto);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Puntos de Venta');

    worksheet.columns = [
      { header: 'NOMBRE_FARMACIA', key: 'name', width: 40 },
      { header: 'ID_ENTIDAD', key: 'entityId', width: 15 },
      { header: 'ID_PAIS', key: 'countryId', width: 15 },
      { header: 'ES_MATRIZ', key: 'matrix', width: 15 },
      { header: 'ID_MATRIZ', key: 'matrixId', width: 15 },
      { header: 'NOMBRE_CADENA', key: 'chainName', width: 30 },
      { header: 'TIPO_PDV', key: 'type', width: 15 },
      { header: 'DIRECCION', key: 'address', width: 30 },
      { header: 'DEPARTAMENTO', key: 'department', width: 15 },
      { header: 'CIUDAD', key: 'city', width: 15 },
      { header: 'GEOLOCALIZACION', key: 'location', width: 30 },
      { header: 'TELEFONO', key: 'phone', width: 15 },
      { header: 'WHATSAPP', key: 'whatsapp', width: 15 },
      { header: 'CORREO', key: 'email', width: 30 },
      { header: 'HORARIO_ATENCION', key: 'hours', width: 30 },
      { header: 'CANT_EMPLEADOS', key: 'countEmployees', width: 15 },
      { header: 'VALOR_VENTAS_MENSUAL', key: 'monthlySales', width: 15 },
      { header: 'MONEDA_LOCAL', key: 'localCurrency', width: 15 },
      { header: 'SERVICIOS_PDV', key: 'services', width: 30 },
      { header: 'LICENCIA_NUMERO', key: 'licenseNumber', width: 30 },
      { header: 'ESTADO_LOCAL', key: 'localStatus', width: 15 },
      { header: 'TIPO_CADENA', key: 'chainType', width: 15 },
      { header: 'INSTITUCIONAL', key: 'institutional', width: 15 },
      { header: 'ESPECIALIZADA', key: 'specialized', width: 15 },
      { header: 'DENTRO_RETAIL', key: 'withinRetail', width: 15 },
      { header: 'CATEGORIA_VENTAS', key: 'salesCategory', width: 15 },
      { header: 'NOTAS', key: 'notes', width: 30 },
      { header: 'ESTADO_VALIDACION', key: 'validationState', width: 15 },
      { header: 'NIVEL_CONFIANZA', key: 'trustLevel', width: 15 },
      { header: 'DIRECCION_CONFIRMADA', key: 'confirmedAddress', width: 30 },
      { header: 'LICENCIA_VALIDADA', key: 'validatedLicense', width: 15 },
      { header: 'GEO_CONFIRMADA', key: 'confirmedLocation', width: 15 },
      { header: 'VALIDADO_POR', key: 'validatedBy', width: 15 },
      { header: 'FECHA_VALIDACION', key: 'validationDate', width: 15 },
      { header: 'SUS_PDV_ESTADO', key: 'pointSaleState', width: 15 },
      { header: 'SUS_PDV_PLAN', key: 'pointSalePlan', width: 15 },
      { header: 'SUS_PDV_FECHA_INICIO', key: 'pointSaleStartDate', width: 15 },
      { header: 'SUS_PDV_FECHA_FIN', key: 'pointSaleEndDate', width: 15 },
      { header: 'SUS_PDV_RENOV_AUTO', key: 'pointSaleAutoRenewal', width: 15 },
    ];

    branchs.forEach((v) => {
      worksheet.addRow({
        ...v,
        validationDate: v.validationDate ? dayjs(v.validationDate).format('YYYY-MM-DD') : '',
        pointSaleStartDate: v.pointSaleStartDate ? dayjs(v.pointSaleStartDate).format('YYYY-MM-DD') : '',
        pointSaleEndDate: v.pointSaleEndDate ? dayjs(v.pointSaleEndDate).format('YYYY-MM-DD') : '',
      });
    });

    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }
}
