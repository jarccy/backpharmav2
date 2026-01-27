import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { GetDTO } from '../../common/dto/params-dto';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { UpdatePeopleDto } from './dto/update-people.dto';
import { StorePeopleDto } from './dto/store-people.dto';
import { WhatsappGateway } from '../whatsapp/websockets/socket.gateaway';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

@Injectable()
export class PeopleService {
  constructor(private readonly prisma: PrismaService, private ws: WhatsappGateway) { }

  async findAll(dto: GetDTO) {
    const {
      search,
      perPage,
      page,
      country,
      city,
      department,
      birthDate,
      startDate,
      endDate,
    } = dto;

    const where: Prisma.peopleWhereInput = {
      ...(country && country != 0 && { countryId: Number(country) }),
      ...(birthDate && {
        birthDate: {
          equals: dayjs(birthDate).toDate(),
        }
      }),
      ...(startDate && endDate
        ? {
          peopleStartDate: {
            gte: new Date(startDate),
            lte: new Date(`${endDate}`),
          },
        }
        : startDate
          ? {
            peopleStartDate: {
              gte: new Date(startDate),
              lte: new Date(`${startDate}`),
            },
          }
          : {}),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { documentNumber: { contains: search } },
          { phone: { contains: search } },
        ]
      }),
    };

    const query = await this.prisma.people.findMany({
      select: {
        id: true,
        name: true,
        documentType: true,
        documentNumber: true,
        birthDate: true,
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

    const total = await this.prisma.people.count({ where });
    const last_page = Math.ceil(total / parseInt(perPage));

    return {
      data: data,
      total,
      last_page,
    };
  }

  async getPeopleById(id: number) {
    const query = await this.prisma.people.findFirst({
      where: { id },
      include: { users: { select: { name: true } } },
    })

    const relation: any = await this.prisma.relationPdv.findFirst({
      select: {
        id: true,
        pointSale: { select: { name: true, id: true } },
        entity: { select: { socialReason: true, id: true } },
        entityId: true,
        pdvId: true,
        createdAt: true,
        updatedAt: true,
        status: true,
      },
      where: { peopleId: id },
      orderBy: { id: 'desc' },
    })

    if (relation) {
      relation.createdAt = relation.createdAt ? dayjs(relation.createdAt).format('YYYY-MM-DD HH:mm') : null
      relation.updatedAt = relation.updatedAt ? dayjs(relation.updatedAt).format('YYYY-MM-DD HH:mm') : null
    }

    return {
      data: query,
      relation: relation ?? null,
    };
  }

  async createPeople(user: number, dto: StorePeopleDto) {
    const { relation, users, ...rest } = dto;

    if (dto.documentNumber) {
      const verifyDocument = await this.prisma.people.findFirst({
        where: { documentNumber: dto.documentNumber.trim() },
      });

      if (verifyDocument) {
        return { error: 'El número de documento ya existe' };
      }
    }

    if (dto.phone) {
      const verifyPhone = await this.prisma.people.findFirst({
        where: { phone: dto.phone.trim() },
      });

      if (verifyPhone) {
        return { error: 'El número de teléfono ya existe' };
      }
    }

    const lastId = await this.prisma.people.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    const newId = lastId?.id ? lastId.id + 1 : 1;
    await this.prisma.people.create({
      data: {
        ...rest, id: newId, validatedBy: user, birthDate: dto.birthDate ? new Date(dto.birthDate) : null, validationDate: dto.validationDate ? new Date(dto.validationDate) : null,
        peopleStartDate: dto.peopleStartDate ? new Date(dto.peopleStartDate) : null, peopleEndDate: dto.peopleEndDate ? new Date(dto.peopleEndDate) : null
      },
    });

    const lastIdRelation = await this.prisma.relationPdv.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });

    const newIdRelation = lastIdRelation?.id ? lastIdRelation.id + 1 : 1;

    await this.prisma.relationPdv.create({
      data: {
        id: newIdRelation,
        peopleId: newId,
        entityId: dto.relation.entityId,
        pdvId: dto.relation.pdvId,
        status: dto.relation.status,
        createdAt: new Date(),
      } as any,
    });

    // console.log(query);

    return 'Persona creada correctamente';
  }

  async updatePeople(user: number, id: number, dto: UpdatePeopleDto) {
    const { relation, users, ...rest } = dto;

    if (dto.documentNumber) {
      const verifyDocument = await this.prisma.people.findFirst({
        where: { documentNumber: dto.documentNumber.trim(), NOT: { id: id } },
      });

      if (verifyDocument) {
        return { error: 'El número de documento ya existe' };
      }
    }

    if (dto.phone) {
      const verifyPhone = await this.prisma.people.findFirst({
        where: { phone: dto.phone.trim(), NOT: { id: id } },
      });

      if (verifyPhone) {
        return { error: 'El número de teléfono ya existe en ' + verifyPhone.name };
      }
    }

    await this.prisma.people.update({
      where: { id },
      data: {
        ...rest,
        validatedBy: user,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : null,
        validationDate: dto.validationDate ? new Date(dto.validationDate) : null,
        peopleStartDate: dto.peopleStartDate ? new Date(dto.peopleStartDate) : null,
        peopleEndDate: dto.peopleEndDate ? new Date(dto.peopleEndDate) : null
      },
    });

    if (relation.id) {
      await this.prisma.relationPdv.update({
        where: {
          id: relation.id,
        },
        data: {
          entityId: dto.relation.entityId ?? null,
          pdvId: dto.relation.pdvId ?? null,
          status: dto.relation.status,
          updatedAt: new Date(),
        }
      });
    }

    return 'Persona actualizado correctamente';
  }

  async getAllPeoples(dto: GetDTO) {
    const {
      search,
      country,
      city,
      department,
      birthDate,
      startDate,
      endDate,
    } = dto;

    const where: Prisma.peopleWhereInput = {
      ...(country && country != 0 && { countryId: Number(country) }),
      ...(birthDate && {
        birthDate: {
          equals: dayjs(birthDate).toDate(),
        }
      }),
      ...(startDate && endDate
        ? {
          peopleStartDate: {
            gte: new Date(startDate),
            lte: new Date(`${endDate}`),
          },
        }
        : startDate
          ? {
            peopleStartDate: {
              gte: new Date(startDate),
              lte: new Date(`${startDate}`),
            },
          }
          : {}),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { documentNumber: { contains: search } },
          { phone: { contains: search } },
        ]
      }),
    };

    const query = await this.prisma.people.findMany({ where })

    return query;
  }

  async exportToExcel(dto: GetDTO) {
    const peoples = await this.getAllPeoples(dto);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Personas');

    worksheet.columns = [
      { header: 'NOMBRE_COMPLETO', key: 'name', width: 40 },
      { header: 'ID_PAIS', key: 'countryId', width: 15 },
      { header: 'ID_ENTIDAD', key: 'entityId', width: 15 },
      { header: 'ES_PROPIETARIO', key: 'isOwner', width: 20 },
      { header: 'ES_REPRESENTANTE_LEGAL', key: 'legalRep', width: 20 },
      { header: 'TIPO_DOCUMENTO', key: 'documentType', width: 15 },
      { header: 'NUMERO_DOCUMENTO', key: 'documentNumber', width: 20 },
      { header: 'FECHA_NACIMIENTO', key: 'birthDate', width: 20 },
      { header: 'PROFESION', key: 'profession', width: 15 },
      { header: 'ROL_SUCURSAL', key: 'branchRole', width: 15 },
      { header: 'ROL_CORPORATIVO', key: 'corporateRole', width: 15 },
      { header: 'NUMERO_COLEGIATURA', key: 'colegiatureNumber', width: 20 },
      { header: 'CELULAR', key: 'phone', width: 20 },
      { header: 'CORREO', key: 'email', width: 30 },
      { header: 'IDIOMA_PREFERIDO', key: 'language', width: 15 },
      { header: 'CONSENTIMIENTO_WHATSAPP', key: 'whatsappConsent', width: 20 },
      { header: 'CONSENTIMIENTO_CORREO', key: 'emailConsent', width: 20 },
      { header: 'HORARIO_SILENCIO', key: 'silenceHours', width: 20 },
      { header: 'INTERESES', key: 'interests', width: 20 },
      { header: 'ESTADO_PERSONA', key: 'peopleStatus', width: 20 },
      { header: 'BANCO', key: 'bank', width: 20 },
      { header: 'PAIS_BANCO', key: 'bankCountry', width: 20 },
      { header: 'TIPO_CUENTA', key: 'accountType', width: 15 },
      { header: 'NUMERO_CUENTA', key: 'accountNumber', width: 20 },
      { header: 'TITULAR_CUENTA', key: 'accountHolder', width: 30 },
      { header: 'ID_FISCAL_TITULAR', key: 'fiscalHolder', width: 20 },
      { header: 'ESTADO_VALIDACION', key: 'validationStatus', width: 20 },
      { header: 'NIVEL_CONFIANZA', key: 'confidenceLevel', width: 20 },
      { header: 'DOC_IDENTIDAD_VALIDADO', key: 'identityValidated', width: 20 },
      { header: 'COLEGIATURA_VALIDADA', key: 'collegeValidated', width: 20 },
      { header: 'CORREO_VALIDADO', key: 'emailValidated', width: 20 },
      { header: 'TELEFONO_VALIDADO', key: 'phoneValidated', width: 20 },
      { header: 'VALIDADO_POR', key: 'validatedBy', width: 20 },
      { header: 'FECHA_VALIDACION', key: 'validationDate', width: 20 },
      { header: 'SUS_PERSONA_ESTADO', key: 'peopleState', width: 20 },
      { header: 'SUS_PERSONA_PLAN', key: 'peoplePlan', width: 20 },
      { header: 'SUS_PERSONA_FECHA_INICIO', key: 'peopleStartDate', width: 20 },
      { header: 'SUS_PERSONA_FECHA_FIN', key: 'peopleEndDate', width: 20 },
      { header: 'SUS_PERSONA_RENOV_AUTO', key: 'autoRenewal', width: 20 },
    ];

    peoples.forEach((v) => {
      worksheet.addRow({
        ...v,
        validationDate: v.validationDate ? dayjs.utc(v.validationDate).format('YYYY-MM-DD') : '',
        peopleStartDate: v.peopleStartDate ? dayjs.utc(v.peopleStartDate).format('YYYY-MM-DD') : '',
        peopleEndDate: v.peopleEndDate ? dayjs.utc(v.peopleEndDate).format('YYYY-MM-DD') : '',
      });
    });

    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  async findPeople(dto: GetDTO) {
    const { search } = dto;

    const where: Prisma.peopleWhereInput = {
      ...(search && {
        OR: [
          { name: { contains: search } },
          { documentNumber: { contains: search } },
        ],
      }),
    };

    const query = await this.prisma.people.findMany({
      select: {
        id: true,
        name: true,
        documentNumber: true,
        phone: true,
      },
      where,
      orderBy: { name: 'asc' },
      take: 10,
    });

    const result = query.map((row) => ({
      ...row,
      id: row.id.toString(),
      label: row.name,
      gender: "Sin Genero",
      value: row.phone,
    }));

    return result;
  }

  async findPeopleSelect(dto: GetDTO) {
    const { page, perPage, search, country, city, branch } = dto;

    const where: Prisma.peopleWhereInput = {
      ...(country && country != 0 && { countryId: Number(country) }),
      ...(branch && {
        relationPdv: {
          some: {
            pdvId: Number(branch)
          }
        }
      }),
      ...(city && {
        relationPdv: {
          some: {
            pointSale: {
              city: city
            }
          }
        }
      }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { documentNumber: { contains: search } },
          { phone: { contains: search } }
        ]
      }),
    };

    const query = await this.prisma.people.findMany({
      select: {
        id: true,
        documentNumber: true,
        name: true,
        phone: true,
        birthDate: true,
        peopleStartDate: true,
        country: { select: { name: true } },
      },
      where,
      skip: (+page - 1) * +perPage,
      take: +perPage,
      orderBy: { name: 'asc' },
    });

    const result = query.map((row) => {
      const age = dayjs().diff(dayjs(row.birthDate), 'year').toString();
      return {
        ...row,
        id: row.id.toString(),
        age,
        gender: 'Sin Genero',
        birthDate: dayjs.utc(row.birthDate).format('YYYY-MM-DD'),
        selected: false,
        enrollmentDate: row.peopleStartDate,
        country: row.country ? row.country.name : null
      };
    });

    const total = await this.prisma.people.count({ where });
    const last_page = Math.ceil(total / parseInt(perPage));

    return {
      data: result,
      total,
      last_page,
    };
  }

  //import people from excel
  async importPeopleFromExcel(userId: number, file: Express.Multer.File) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer as any);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) {
      return 'No se encontró la hoja de trabajo en el archivo.';
    }

    const expectedHeaders = [
      'ID_PAIS', 'NOMBRE', 'TIPO_DOCUMENTO', 'NUMERO_DOCUMENTO', 'FECHA_NACIMIENTO',
      'PROFESION', 'ROL_SUCURSAL', 'ROL_CORPORATIVO', 'NUMERO_COLEGIATURA', 'CELULAR',
      'CORREO', 'IDIOMA_PREFERIDO', 'CONSENTIMIENTO_WHATSAPP', 'CONSENTIMIENTO_CORREO',
      'HORARIO_SILENCIO', 'INTERESES', 'ESTADO_PERSONA', 'BANCO', 'PAIS_BANCO',
      'TIPO_CUENTA', 'NUMERO_CUENTA', 'TITULAR_CUENTA', 'ID_FISCAL_TITULAR',
      'ESTADO_VALIDACION', 'NIVEL_CONFIANZA', 'DOC_IDENTIDAD_VALIDADO',
      'COLEGIATURA_VALIDADA', 'CORREO_VALIDADO', 'TELEFONO_VALIDADO', 'FECHA_VALIDACION',
      'SUS_PERSONA_ESTADO', 'SUS_PERSONA_PLAN', 'SUS_PERSONA_FECHA_INICIO',
      'SUS_PERSONA_FECHA_FIN', 'SUS_PERSONA_RENOV_AUTO'
    ];

    const headerMap = new Map<string, number>();
    const headerRow = worksheet.getRow(2);

    // Iterar por las columnas de forma manual para asegurar que no se salte ninguna
    const maxCols = Math.max(worksheet.columnCount, 40);
    for (let i = 1; i <= maxCols; i++) {
      const cell = headerRow.getCell(i);
      const val = cell.value;
      let text = '';

      if (val && typeof val === 'object' && 'richText' in val) {
        text = (val as any).richText.map((rt: any) => rt.text).join('');
      } else {
        text = cell.text || (val ? val.toString() : '');
      }

      const normalized = text
        .replace(/[\u00A0\u1680\u180E\u2000-\u200B\u202F\u205F\u3000\uFEFF]/g, ' ')
        .trim()
        .toUpperCase();

      if (normalized) {
        headerMap.set(normalized, i);
      }
    }



    const missingHeaders = expectedHeaders.filter(h => !headerMap.has(h));

    if (missingHeaders.length > 0) {
      await this.prisma.notify.create({
        data: {
          title: 'Error de Formato (Columnas)',
          message: `Faltan las siguientes columnas o sus nombres no coinciden exactamente: ${missingHeaders.join(', ')}. Asegúrate de que los encabezados estén en la fila 2 y coincidan con el formato esperado.`.slice(0, 3000),
          type: 'error',
          status: 'new',
          userId,
        },
      });
      this.ws.emitEvent('Notify', { type: 'notify' });
      return 'El archivo no tiene todas las columnas requeridas.';
    }

    // Process in background
    (async () => {
      try {
        const lastPerson = await this.prisma.people.findFirst({
          orderBy: { id: 'desc' },
          select: { id: true },
        });
        let currentId = lastPerson?.id || 0;

        const lastRelation = await this.prisma.relationPdv.findFirst({
          orderBy: { id: 'desc' },
          select: { id: true },
        });
        let currentRelationId = lastRelation?.id || 0;

        const peopleToCreate = [];
        const relationsToCreate = [];
        const errors = [];

        const parseDate = (value: any) => {
          if (!value) return null;
          if (value instanceof Date) return value;
          const dateStr = value.toString().trim();
          if (dateStr.includes('/')) {
            const [day, month, year] = dateStr.split('/');
            const date = dayjs(`${year}-${month}-${day}`).toDate();
            return isNaN(date.getTime()) ? null : date;
          }
          const date = new Date(value);
          return isNaN(date.getTime()) ? null : date;
        };

        const getCellValue = (row: ExcelJS.Row, headerName: string) => {
          const colIndex = headerMap.get(headerName);
          return colIndex ? row.getCell(colIndex).value : null;
        };

        const getNumber = (value: any) => {
          const num = Number(value);
          return isNaN(num) ? null : num;
        };

        const getString = (value: any) => {
          return value?.toString()?.trim() || null;
        };

        // Get all existing document numbers for validation
        const existingDocs = new Set(
          (await this.prisma.people.findMany({
            select: { documentNumber: true },
            where: { documentNumber: { not: null } }
          })).map(p => p.documentNumber)
        );

        worksheet.eachRow(async (row, rowNumber) => {
          if (rowNumber <= 2) return;

          const documentNumber = getString(getCellValue(row, 'NUMERO_DOCUMENTO'));
          const name = getString(getCellValue(row, 'NOMBRE'));

          if (!name) return;

          if (documentNumber && existingDocs.has(documentNumber)) {
            errors.push(`${name} (${documentNumber})`);
            return;
          }

          currentId++;
          currentRelationId++;

          const personData = {
            id: currentId,
            countryId: getNumber(getCellValue(row, 'ID_PAIS')),
            name: name,
            documentType: getNumber(getCellValue(row, 'TIPO_DOCUMENTO')),
            documentNumber: documentNumber,
            birthDate: parseDate(getCellValue(row, 'FECHA_NACIMIENTO')),
            profession: getNumber(getCellValue(row, 'PROFESION')),
            branchRole: getNumber(getCellValue(row, 'ROL_SUCURSAL')),
            corporateRole: getNumber(getCellValue(row, 'ROL_CORPORATIVO')),
            colegiatureNumber: getString(getCellValue(row, 'NUMERO_COLEGIATURA')),
            phone: getString(getCellValue(row, 'CELULAR')),
            email: getString(getCellValue(row, 'CORREO')),
            language: getNumber(getCellValue(row, 'IDIOMA_PREFERIDO')),
            whatsappConsent: getString(getCellValue(row, 'CONSENTIMIENTO_WHATSAPP')),
            emailConsent: getString(getCellValue(row, 'CONSENTIMIENTO_CORREO')),
            silenceHours: getString(getCellValue(row, 'HORARIO_SILENCIO')),
            interests: getNumber(getCellValue(row, 'INTERESES')),
            peopleStatus: getNumber(getCellValue(row, 'ESTADO_PERSONA')),
            bank: getString(getCellValue(row, 'BANCO')),
            bankCountry: getString(getCellValue(row, 'PAIS_BANCO')),
            accountType: getNumber(getCellValue(row, 'TIPO_CUENTA')),
            accountNumber: getString(getCellValue(row, 'NUMERO_CUENTA')),
            accountHolder: getString(getCellValue(row, 'TITULAR_CUENTA')),
            fiscalHolder: getString(getCellValue(row, 'ID_FISCAL_TITULAR')),
            validationStatus: getNumber(getCellValue(row, 'ESTADO_VALIDACION')),
            confidenceLevel: getNumber(getCellValue(row, 'NIVEL_CONFIANZA')),
            identityValidated: getString(getCellValue(row, 'DOC_IDENTIDAD_VALIDADO')),
            collegeValidated: getString(getCellValue(row, 'COLEGIATURA_VALIDADA')),
            emailValidated: getString(getCellValue(row, 'CORREO_VALIDADO')),
            phoneValidated: getString(getCellValue(row, 'TELEFONO_VALIDADO')),
            validatedBy: userId,
            validationDate: parseDate(getCellValue(row, 'FECHA_VALIDACION')),
            peopleState: getString(getCellValue(row, 'SUS_PERSONA_ESTADO')),
            peoplePlan: getString(getCellValue(row, 'SUS_PERSONA_PLAN')),
            peopleStartDate: parseDate(getCellValue(row, 'SUS_PERSONA_FECHA_INICIO')) || new Date(),
            peopleEndDate: parseDate(getCellValue(row, 'SUS_PERSONA_FECHA_FIN')),
            autoRenewal: getString(getCellValue(row, 'SUS_PERSONA_RENOV_AUTO')),
          };

          peopleToCreate.push(personData);
          relationsToCreate.push({
            id: currentRelationId,
            peopleId: currentId,
            status: true,
            createdAt: new Date(),
          });

          if (documentNumber) existingDocs.add(documentNumber);
        });

        if (peopleToCreate.length === 0) {
          await this.prisma.notify.create({
            data: {
              title: 'Error en Importación',
              message: (errors.length > 0
                ? `No se pudieron importar personas. Errores: ${errors.join(' ')}`
                : 'No se encontraron datos válidos en el archivo.'),
              type: 'error',
              status: 'new',
              userId,
            },
          });
          return;
        }

        await this.prisma.$transaction(async (tx) => {
          await tx.people.createMany({ data: peopleToCreate });
          await tx.relationPdv.createMany({ data: relationsToCreate as any });
        });

        await this.prisma.notify.create({
          data: {
            title: 'Importación Exitosa',
            message: `Se han importado ${peopleToCreate.length} personas correctamente.${errors.length > 0 ? `\n\nNo se agregaron los siguientes (Documento ya existe): \n- ${errors.join('\n- ')}` : ''}`,
            type: 'success',
            status: 'new',
            userId,
          },
        });
      } catch (error) {
        console.error('Error importing people:', error);
        await this.prisma.notify.create({
          data: {
            title: 'Error en Importación',
            message: `No se pudo completar la importación. Error: ${error.message || 'Error desconocido'}.`,
            type: 'error',
            status: 'new',
            userId,
          },
        });
      } finally {
        this.ws.emitEvent('Notify', { type: 'notify' });
      }
    })();

    return 'La importación ha comenzado en segundo plano.';
  }
}
