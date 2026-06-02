import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { GreetingService } from './greeting.service';

@Controller('api')
export class GreetingController {
  constructor(private readonly greetingService: GreetingService) {}

  @Get('greeting')
  async getGreeting(
    @Query('name') name: string = '',
    @Query('locale') locale: string = 'en'
  ) {
    try {
      return await this.greetingService.getGreeting(name, locale);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Bad request'
      );
    }
  }
}
