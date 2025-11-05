import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Prisma } from '@prisma/client';
import { GetDTO } from '../../common/dto/params-dto';

@Injectable()
export class DataService {
  constructor(private readonly prisma: PrismaService) { }

  async findCountries() {
    const query = Prisma.sql`
    SELECT
      p.id AS value,
      p.nombre AS label
    FROM pais AS p
  `;

    const serializedData = await this.prisma.$queryRaw(query);

    const data = JSON.parse(
      JSON.stringify(serializedData, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      )
    );

    data.forEach(item => {
      if (item.value) {
        item.value = Number(item.value);
      }
    });

    return data;
  }

  async getMaintenance() {
    const query = Prisma.sql`
      SELECT
        mcab.id,
        mcab.nombre,
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT("label", mdet.valor, "value", mdet.id)
          )
          FROM opcion_lista AS mdet 
          WHERE mdet.ID_GRUPO = mcab.id
        ) AS detalles
      FROM grupo_lista AS mcab
      GROUP BY mcab.id, mcab.nombre
    `;

    type Row = {
      id: number | bigint;
      nombre: string;
      detalles: string | any[] | null;
    };

    const serializedData = await this.prisma.$queryRaw<Row[]>(query);

    const data = serializedData.map((row) => ({
      id: typeof row.id === 'bigint' ? Number(row.id) : row.id,
      descripcion: row.nombre,
      detalles:
        row.detalles == null
          ? []
          : typeof row.detalles === 'string'
            ? JSON.parse(row.detalles)
            : row.detalles,
    }));


    return data;
  }

  async findDepartment(dto: GetDTO) {
    const { search } = dto;

    const query = await this.prisma.region.findMany(
      {
        select: {
          id: true,
          name: true,
          country: { select: { name: true } },
        },
        where: {
          name: {
            contains: search,
          },
        },
        take: 10,
      },
    );

    const result = query.map((row) => ({
      label: `${row.name}`,
      value: row.id,
      other: row.country.name,
    }));

    return result;
  }

  async findCity(dto: GetDTO) {
    const { search } = dto;

    const query = await this.prisma.city.findMany(
      {
        select: {
          id: true,
          name: true,
          region: { select: { name: true, country: { select: { name: true } } } },
        },
        where: {
          name: {
            contains: search,
          },
        },
        take: 10,
      },
    );

    const result = query.map((row) => ({
      label: row.name,
      value: row.id,
      other: row.region.name + ' / ' + row.region.country.name,
    }));

    return result;
  }

  async getEntity(dto: GetDTO) {
    const { search } = dto;

    const query = await this.prisma.entity.findMany({
      select: {
        id: true,
        socialReason: true,
        fiscalDoc: true,
        // peopleType: true,
        // country: true,
        // department: true,
        // city: true,
      },
      where: search
        ? {
          OR: [
            {
              socialReason: {
                contains: search,
              },
            },
            {
              fiscalDoc: {
                contains: search,
              },
            },
          ],
        }
        : {},
      take: 10,
    });

    const result = query.map((row) => ({
      label: `${row.socialReason} - ${row.fiscalDoc}`,
      value: row.id,
    }));

    return result;
  }

  async getPdv(dto: GetDTO) {
    const { search } = dto;
    const query = await this.prisma.pointSale.findMany({
      select: {
        id: true,
        name: true,
        chainName: true,
      },
      where: {
        name: {
          contains: search,
        },
      },
      take: 10,
    });

    const result = query.map((row) => ({
      label: `${row.name}`,
      value: row.id,
      other: row.chainName
    }));

    return result;
  }

  async getWhatsapp() {
    const query = await this.prisma.whatsapps.findMany({
      select: {
        id: true,
        name: true,
        countryId: true,
      },
    });

    const result = query.map((row) => ({
      label: `${row.name}`,
      value: row.id,
      country: row.countryId
    }));

    return result;
  }

}
