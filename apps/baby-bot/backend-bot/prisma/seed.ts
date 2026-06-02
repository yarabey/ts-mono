import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  // A single default child (id 1) — the original baby-ai is single-child.
  await prisma.child.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: 'Baby',
      birthDate: new Date('2025-01-01'),
      gender: 'male',
    },
  });

  // Default user (id 1) used by the key/value settings store.
  await prisma.user.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, telegramId: BigInt(0), firstName: 'Parent', role: 'parent' },
  });

  console.log('Seed data inserted');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
