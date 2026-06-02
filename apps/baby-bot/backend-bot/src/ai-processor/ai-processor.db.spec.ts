/**
 * AI raw-entry parsing against a real (throwaway) Postgres with the LLM mocked.
 * Gated on TEST_DATABASE_URL (see events.db.spec.ts). Proves the full apply
 * path: pending entry -> validated operations -> event + detail created in one
 * transaction -> entry marked processed -> linked via event_raw_entries.
 */
// Avoid loading the real TelegramService (pulls in ESM socks-proxy-agent /
// node-telegram-bot-api, which Jest's CJS transform can't parse).
jest.mock('../telegram/telegram.service', () => ({
  TelegramService: class {
    async sendMessage() {
      return undefined;
    }
  },
}));

const describeDb = process.env.TEST_DATABASE_URL ? describe : describe.skip;

describeDb('ai-processor (real DB, mocked LLM)', () => {
  it('parses a pending entry into a linked feeding event', async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    const { PrismaService } = await import('../prisma/prisma.service');
    const { AppConfigService } = await import('../config/app-config.service');
    const { DiaryService } = await import('../diary/diary.service');
    const { RawEntriesService } = await import('../raw-entries/raw-entries.service');
    const { AiProcessorService } = await import('./ai-processor.service');

    const prisma = new PrismaService();
    const config = new AppConfigService();
    const diary = new DiaryService(config);
    const rawEntries = new RawEntriesService(prisma, diary);
    const telegram = { sendMessage: async () => undefined } as never;
    const processor = new AiProcessorService(prisma, config, rawEntries, telegram);

    try {
      await prisma.child.upsert({
        where: { id: 1 },
        update: {},
        create: { id: 1, name: 'Test', birthDate: new Date('2026-01-01') },
      });
      const entry = await prisma.rawEntry.create({
        data: { source: 'telegram', text: 'покормила грудью', recordedAt: new Date(), status: 'pending' },
      });

      const ops = {
        operations: [
          {
            action: 'create_event',
            event: { child_id: 1, event_type: 'feeding', occurred_at: new Date().toISOString(), source: 'ai_parsed' },
            details: { table: 'event_feedings', data: { feeding_type: 'breast' } },
            raw_entry_id: entry.id,
          },
        ],
      };

      const result = await processor.process(async () => JSON.stringify(ops));
      expect(result.processed).toBe(1);

      const reloaded = await prisma.rawEntry.findUnique({ where: { id: entry.id } });
      expect(reloaded?.status).toBe('processed');

      const created = await prisma.event.findFirst({
        where: { rawEntryId: entry.id, eventType: 'feeding' },
        include: { feeding: true, rawEntryLinks: true },
      });
      expect(created?.feeding?.feedingType).toBe('breast');
      expect(created?.rawEntryLinks[0]?.role).toBe('created');

      // cleanup
      if (created) await prisma.event.delete({ where: { id: created.id } });
      await prisma.rawEntry.delete({ where: { id: entry.id } });
    } finally {
      await prisma.$disconnect();
    }
  });
});
