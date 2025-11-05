import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { GetDTO } from '../../common/dto/params-dto';
import { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';
import { UpdatePeopleDto } from '../dto/people/update-people.dto';
import { StorePeopleDto } from '../dto/people/store-people.dto';
const dayjs = require('dayjs');

@Injectable()
export class PeopleService {
  constructor(private readonly prisma: PrismaService) { }

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

    const relation = await this.prisma.relationPdv.findFirst({
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
    //   const searchQuery = search
    //     ? Prisma.sql`
    //       AND (
    //         nombre LIKE ${`%${search}%`} OR 
    //         apellido LIKE ${`%${search}%`} OR 
    //         numero_documento LIKE ${`%${search}%`}
    //       )
    //     `
    //     : Prisma.sql``;

    //   const query = Prisma.sql`
    //   SELECT DISTINCT
    //     id,
    //     nombre,
    //     numero_documento AS documentNumber,
    //     CONCAT(nombre, ' ', apellido) AS label,
    //     sexo AS gender,
    //     celular AS value
    //   FROM 
    //     personas
    //   WHERE 1=1 ${searchQuery}
    //   ORDER BY nombre ASC
    //   LIMIT 10;
    // `;

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

  // let filterQuery = Prisma.sql``;
  // const searchQuery = search
  //   ? Prisma.sql`
  //     AND (
  //       nombre LIKE ${`%${search}%`} OR 
  //       apellido LIKE ${`%${search}%`} OR 
  //       numero_documento LIKE ${`%${search}%`} OR
  //       celular LIKE ${`%${search}%`}
  //     )
  //   `
  //   : Prisma.sql``;

  // if (country && country != 0) {
  //   filterQuery = Prisma.sql`${filterQuery} AND id_pais = ${country}`;
  // }

  // if (gender) {
  //   filterQuery = Prisma.sql`${filterQuery} AND sexo = ${gender}`;
  // }

  // if (birthDate) {
  //   filterQuery = Prisma.sql`${filterQuery} AND DATE_FORMAT(fecha_nacimiento, '%m-%d') = ${birthDate}`;
  // }

  // if (incriptionDate) {
  //   filterQuery = Prisma.sql`${filterQuery} AND fecha_inscripcion = ${incriptionDate}`;
  // }

  // if (startDate && endDate) {
  //   const endDateTime = endDate + ' 23:59:59';
  //   filterQuery = Prisma.sql`${filterQuery} AND fecha_inscripcion BETWEEN ${startDate} AND ${endDateTime}`;
  // }


  //   const query = Prisma.sql`
  //   SELECT DISTINCT
  //     id,
  //     numero_documento AS documentNumber,
  //     CONCAT(nombre, ' ', apellido) AS name,
  //     sexo AS gender,
  //     celular AS phone,
  //     fecha_nacimiento as birthDate,
  //     fecha_inscripcion AS enrollmentDate
  //   FROM 
  //     pacientes
  //   WHERE 1=1 ${searchQuery} ${filterQuery}
  //   ORDER BY  fecha_inscripcion DESC
  //   LIMIT 50;
  // `;

  // const { search, country, gender, birthDate, incriptionDate, startDate, endDate } = dto;

  async findPeopleSelect(dto: GetDTO) {
    const { search, first, country, city, branch } = dto;

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
      take: first ? 50 : 100,
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
        country: row.country.name
      };
    });

    return result;
  }

}
