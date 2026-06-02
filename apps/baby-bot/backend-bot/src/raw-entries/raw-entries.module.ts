import { Module } from '@nestjs/common';
import { RawEntriesController } from './raw-entries.controller';
import { RawEntriesService } from './raw-entries.service';

@Module({
  controllers: [RawEntriesController],
  providers: [RawEntriesService],
  exports: [RawEntriesService],
})
export class RawEntriesModule {}
