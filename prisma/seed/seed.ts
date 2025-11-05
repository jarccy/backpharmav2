import { PrismaService } from '../../src/prisma.service';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaService();

async function main() {
  const password = '123456';
  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.users.create({
    data: {
      name: 'admin',
      email: 'admin@admin.com',
      password: hashedPassword,
      status: true,
      role: {
        connect: { id: 1 },
      },
    },
  });
  console.log('Usuario creado');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
