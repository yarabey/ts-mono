import { Controller, Get, Query, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ExportService } from './export.service';

@Controller('api/export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('csv')
  async csv(@Query('child_id') childId: string | undefined, @Res() reply: FastifyReply) {
    const csv = await this.exportService.toCsv(childId ? Number(childId) : 1);
    reply
      .type('text/csv; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="baby-bot-export.csv"')
      // Prepend a UTF-8 BOM so Excel reads the Cyrillic headers correctly.
      .send('﻿' + csv);
  }
}
