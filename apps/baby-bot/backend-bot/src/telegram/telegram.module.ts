import { Global, Module } from '@nestjs/common';
import { StatsModule } from '../stats/stats.module';
import { RawEntriesModule } from '../raw-entries/raw-entries.module';
import { TelegramService } from './telegram.service';
import { QueryResponderService } from './query-responder.service';

@Global()
@Module({
  imports: [StatsModule, RawEntriesModule],
  providers: [TelegramService, QueryResponderService],
  exports: [TelegramService],
})
export class TelegramModule {}
