import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { CurrentUser } from '../auth/current-user.decorator';
import type { JwtUser } from '../auth/jwt-auth.guard';

@Controller('api/settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get(':key')
  get(@Param('key') key: string, @CurrentUser() user?: JwtUser) {
    return this.settings.get(user?.id || 1, key);
  }

  @Put(':key')
  set(
    @Param('key') key: string,
    @Body() body: { value?: string },
    @CurrentUser() user?: JwtUser,
  ) {
    return this.settings.set(user?.id || 1, key, body?.value);
  }
}
