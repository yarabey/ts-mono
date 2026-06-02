import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  CreateEventPayloadSchema,
  EventFilterSchema,
  UpdateEventPayloadSchema,
} from '@acme/baby-bot-domain';
import { EventsService } from './events.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/jwt-auth.guard';

@Controller('api/events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list(@Query() query: Record<string, string>) {
    return this.events.list(EventFilterSchema.parse(query));
  }

  @Get('active')
  active() {
    return this.events.getActive();
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.events.getById(id);
  }

  @Post()
  create(@Body() body: unknown, @CurrentUser() user?: JwtUser) {
    return this.events.create(CreateEventPayloadSchema.parse(body), user?.first_name);
  }

  @Post('quick/feeding')
  quickFeeding(@Body() body: Record<string, unknown>, @CurrentUser() user?: JwtUser) {
    return this.events.quickFeeding(body ?? {}, user?.first_name);
  }

  @Post('quick/diaper')
  quickDiaper(@Body() body: Record<string, unknown>, @CurrentUser() user?: JwtUser) {
    return this.events.quickDiaper(body ?? {}, user?.first_name);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: unknown) {
    return this.events.update(id, UpdateEventPayloadSchema.parse(body));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    await this.events.remove(id);
  }

  @Post(':id/close')
  close(@Param('id', ParseIntPipe) id: number) {
    return this.events.close(id);
  }

  @Delete()
  @HttpCode(204)
  async clear(): Promise<void> {
    await this.events.clearAll();
  }
}
