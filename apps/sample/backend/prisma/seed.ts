import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.greetingTemplate.upsert({
    where: { locale: 'en' },
    update: {},
    create: { locale: 'en', template: 'Hello, {name}!' },
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
