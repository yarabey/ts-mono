import { Module } from '@nestjs/common';
import { RawEntriesModule } from '../raw-entries/raw-entries.module';
import { AliceController } from './alice.controller';

@Module({
  imports: [RawEntriesModule],
  controllers: [AliceController],
})
export class AliceModule {}
