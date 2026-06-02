import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { StatsQuerySchema } from '@acme/baby-bot-domain';
import { StatsService } from './stats.service';

@Controller('api/stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}

  @Get()
  async get(@Query() query: Record<string, string>) {
    const q = StatsQuerySchema.parse(query);
    const period = q.period ?? 'today';
    if (!['today', 'week', 'month', 'custom'].includes(period)) {
      throw new BadRequestException('Invalid period. Use: today, week, month, custom');
    }
    const { from, to } = this.stats.resolvePeriod(period, q.date_from, q.date_to);
    return this.stats.computeStats(q.child_id ?? 1, from, to);
  }

  @Get('pattern')
  pattern(@Query() query: Record<string, string>) {
    const date = query.date ?? new Date().toISOString().slice(0, 10);
    const childId = query.child_id ? Number(query.child_id) : 1;
    return this.stats.computePattern(childId, date);
  }

  @Get('growth-chart')
  growthChart(@Query() query: Record<string, string>) {
    const childId = query.child_id ? Number(query.child_id) : 1;
    return this.stats.growthChart(childId);
  }
}
