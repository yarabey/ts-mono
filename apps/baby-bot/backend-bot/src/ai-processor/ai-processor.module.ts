import { Module } from '@nestjs/common';
import { RawEntriesModule } from '../raw-entries/raw-entries.module';
import { AiProcessorService } from './ai-processor.service';

@Module({
  imports: [RawEntriesModule],
  providers: [AiProcessorService],
  exports: [AiProcessorService],
})
export class AiProcessorModule {}
