import { Module } from '@nestjs/common';
import { CsvImportService } from './csv-import.service';
import { ImportController } from './import.controller';

@Module({
  controllers: [ImportController],
  providers: [CsvImportService],
  exports: [CsvImportService],
})
export class DataImportModule {}
