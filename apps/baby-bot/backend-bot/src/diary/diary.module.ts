import { Global, Module } from '@nestjs/common';
import { DiaryService } from './diary.service';

@Global()
@Module({
  providers: [DiaryService],
  exports: [DiaryService],
})
export class DiaryModule {}
