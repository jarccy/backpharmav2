import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { PassUserDto } from '../dto/pass-user.dto';
import { PrismaService } from '../../prisma.service';
import { GetDTO } from '../../common/dto/params-dto';
import * as bcrypt from 'bcrypt';
import * as ExcelJS from 'exceljs';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  async findAll(dto: GetDTO) {
    const { search } = dto;

    const query = await this.prisma.users.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        password: false,
        status: true,
        whatsappId: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            description: true,
            id: true,
          },
        },
        countryId: true
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
              email: {
                contains: search,
              },
            },
          ],
        }
        : {},
    });

    const data = JSON.parse(
      JSON.stringify(query, (key, value) =>
        typeof value === 'bigint' ? Number(value) : value,
      ),
    );

    return data;
  }

  async create(createUserDto: CreateUserDto) {
    const user = await this.findOneByEmail(createUserDto.email);
    if (user) {
      throw new BadRequestException('User already exists');
    }

    const wsId = await this.prisma.whatsapps.findFirst()

    createUserDto.password = await this.hashPassword(createUserDto.password);
    createUserDto.whatsappId = wsId?.id || null;

    await this.prisma.users.create({ data: createUserDto });

    return 'User created Successfully';
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.findOneByEmail(updateUserDto.email);

    if (user && user.id !== id) {
      return false;
    }

    await this.prisma.users.update({ data: updateUserDto, where: { id: id } });
    return 'User update Successfully';
  }

  async updatePassword(id: number, passUserDto: PassUserDto) {
    const hashedPassword = await this.hashPassword(passUserDto.password);

    await this.prisma.users.update({
      where: { id: id },
      data: { password: hashedPassword },
    });

    return 'Password updated Successfully';
  }

  findProfileWithPassword(email: string) {
    return this.prisma.users.findUnique({
      where: { email: email },
      select: { id: true, name: true, email: true, password: true, role: true },
    });
  }

  async findOneByEmail(email: string) {
    return this.prisma.users.findUnique({
      where: { email: email },
      select: {
        id: true,
        name: true,
        email: true,
        password: true,
        roleId: true
      },
    });
  }

  async hashPassword(password: String) {
    const pass = await bcrypt.hash(password, 10);
    return pass;
  }

  async getUser(userId: number) {
    const user = await this.prisma.users.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: {
                  include: {
                    children: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const result = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.description,
      countryId: user.countryId ? Number(user.countryId) : null,
      whatsappId: user.whatsappId ? Number(user.whatsappId) : null,
      permissions: user.role.rolePermissions.map((rp) => ({
        id: rp.permission.id,
        name: rp.permission.name,
        actions: rp.permission.children.map((child) => child.name),
      })),
    };

    return result;
  }

  findOne(id: number) {
    return this.prisma.users.findUnique({ where: { id: id } });
  }

  async getAllUsers(dto: GetDTO) {
    const { search } = dto;

    const data = await this.prisma.users.findMany({
      select: {
        name: true,
        email: true,
        password: false,
        status: true,
        whatsappId: false,
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
              email: {
                contains: search,
              },
            },
          ],
        }
        : {},
    });

    return data;
  }

  async exportToExcel(dto: GetDTO) {
    const data = (await this.getAllUsers(dto)) as any[];

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Lista');
    worksheet.columns = [
      { header: 'Nombre', key: 'name', width: 40 },
      { header: 'Email', key: 'email', width: 40 },
      { header: 'Estado', key: 'status', width: 40 },
      { header: 'Creado', key: 'createdAt', width: 40 },
      { header: 'Actualizado', key: 'updatedAt', width: 40 },
    ];

    data.forEach((v) => {
      worksheet.addRow({
        name: v.name,
        email: v.email,
        status: v.status,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      });
    });

    worksheet.getRow(1).font = { bold: true };
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }
}
