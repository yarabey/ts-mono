import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { StartTimerPayloadSchema } from '@acme/baby-bot-domain';
import { TimersService } from './timers.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/jwt-auth.guard';

@Controller('api/timers')
export class TimersController {
  constructor(private readonly timers: TimersService) {}

  @Post('start')
  start(@Body() body: unknown) {
    return this.timers.start(StartTimerPayloadSchema.parse(body));
  }

  @Post(':timer_id/stop')
  stop(@Param('timer_id') timerId: string, @CurrentUser() user?: JwtUser) {
    return this.timers.stop(timerId, user?.first_name);
  }

  @Get('active')
  active() {
    return this.timers.active();
  }
}
