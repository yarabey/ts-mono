/**
 * Event CRUD round-trip against a real (throwaway) Postgres.
 *
 * Per AGENTS.md, DB-touching specs run against a throwaway Postgres. This
 * suite is gated on TEST_DATABASE_URL so the default `nx test` (no DB, e.g.
 * CI's $0 lint/test/build) skips it; CI/local with a provisioned database
 * runs it. Apply the schema first: `prisma migrate deploy`.
 */
const describeDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeDb('events CRUD (throwaway Postgres)', () => {
  it('creates a feeding event with its detail row and reads it back enriched', async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    const { PrismaService } = await import('../prisma/prisma.service');
    const { EventsService } = await import('./events.service');
    const prisma = new PrismaService();
    const service = new EventsService(prisma);
    try {
      await prisma.child.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1, name: 'Test', birthDate: new Date('2026-01-01') },
      });
      const created = await service.create({
        event_type: 'feeding',
        details: { feeding_type: 'breast', breast_side: 'left', duration_min: 10 },
      });
      expect(created.event_type).toBe('feeding');
      const read = await service.getById(created.id);
      expect(read.details).toMatchObject({ feeding_type: 'breast', breast_side: 'left' });
      await service.remove(created.id);
    } finally {
      await prisma.$disconnect();
    }
  });
});
