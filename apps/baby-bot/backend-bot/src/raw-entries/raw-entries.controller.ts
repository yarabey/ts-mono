import { Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { RawEntryStatusSchema } from '@acme/baby-bot-domain';
import { RawEntriesService } from './raw-entries.service';

@Controller('api/raw-entries')
export class RawEntriesController {
  constructor(private readonly rawEntries: RawEntriesService) {}

  @Get()
  list(@Query() query: Record<string, string>) {
    const status = query.status ? RawEntryStatusSchema.parse(query.status) : undefined;
    return this.rawEntries.list({
      status,
      limit: query.limit ? Number(query.limit) : undefined,
      offset: query.offset ? Number(query.offset) : undefined,
    });
  }

  @Post(':id/retry')
  retry(@Param('id', ParseIntPipe) id: number) {
    return this.rawEntries.retry(id);
  }
}
