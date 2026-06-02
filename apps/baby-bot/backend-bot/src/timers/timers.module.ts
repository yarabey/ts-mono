import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { TimersController } from './timers.controller';
import { TimersService } from './timers.service';

@Module({
  imports: [EventsModule],
  controllers: [TimersController],
  providers: [TimersService],
})
export class TimersModule {}
