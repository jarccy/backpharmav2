import { Injectable } from '@nestjs/common';
import { CreateRoleDto } from '../dto/create-role.dto';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const roles = await this.prisma.role.findMany({
      select: {
        id: true,
        description: true,
        createdAt: true,
        updatedAt: true,
        rolePermissions: {
          select: {
            permissionId: true,
          },
        },
      },
    });

    return roles.map((role) => ({
      id: role.id,
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
      permissions: role.rolePermissions.map(
        (permission) => permission.permissionId,
      ),
    }));
  }

  async create(createRoleDto: CreateRoleDto) {
    const role = await this.prisma.role.create({
      data: {
        description: createRoleDto.description,
      },
    });

    const rolePermissions = createRoleDto.permissions.map((permissionId) => ({
      roleId: role.id,
      permissionId: permissionId,
    }));

    await this.prisma.rolePermission.createMany({
      data: rolePermissions,
    });

    return 'Role created Successfully';
  }

  async update(id: number, updateRoleDto: CreateRoleDto) {
    await this.prisma.rolePermission.deleteMany({
      where: {
        roleId: id,
      },
    });

    await this.prisma.role.update({
      where: { id },
      data: {
        description: updateRoleDto.description,
      },
    });

    const rolePermissions = updateRoleDto.permissions.map((permissionId) => ({
      roleId: id,
      permissionId: permissionId,
    }));

    await this.prisma.rolePermission.createMany({
      data: rolePermissions,
    });

    return 'Role update Successfully';
  }

  async getRoles() {
    const roles = await this.prisma.role.findMany({
      select: {
        id: true,
        description: true,
      },
    });

    return roles.map((role) => ({
      value: role.id,
      label: role.description,
    }));
  }

  async getPermissions() {
    const permissions = await this.prisma.permissions.findMany({
      where: {
        parent: null,
      },
      select: {
        id: true,
        description: true,
        children: {
          select: {
            id: true,
            description: true,
          },
        },
      },
    });

    return permissions.map((permission) => ({
      id: permission.id,
      label: permission.description,
      key: permission.description,
      children: permission.children.map((child) => ({
        key: child.id,
        label: child.description,
      })),
    }));
  }
}
