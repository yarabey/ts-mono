import { StatsService } from './stats.service';
import type { PrismaService } from '../prisma/prisma.service';

// resolvePeriod is pure (no DB access), so a stub Prisma is sufficient.
const stats = new StatsService({} as unknown as PrismaService);

describe('StatsService.resolvePeriod', () => {
  it('returns today for the today period', () => {
    const { from, to } = stats.resolvePeriod('today');
    expect(from).toBe(to);
  });

  it('spans 7 days for week', () => {
    const { from, to } = stats.resolvePeriod('week');
    const days = (new Date(to).getTime() - new Date(from).getTime()) / 86400000;
    expect(Math.round(days)).toBe(7);
  });

  it('uses explicit bounds for custom', () => {
    expect(stats.resolvePeriod('custom', '2026-01-01', '2026-01-31')).toEqual({
      from: '2026-01-01',
      to: '2026-01-31',
    });
  });
});
