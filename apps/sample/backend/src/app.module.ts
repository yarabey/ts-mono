import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { GreetingModule } from './greeting/greeting.module';

@Module({
  imports: [HealthModule, GreetingModule],
})
export class AppModule {}
