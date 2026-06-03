import { Module } from '@nestjs/common';
import { CsvImportService } from './csv-import.service';
import { RealmImportService } from './realm-import.service';
import { ImportController } from './import.controller';

@Module({
  controllers: [ImportController],
  providers: [CsvImportService, RealmImportService],
  exports: [CsvImportService, RealmImportService],
})
export class DataImportModule {}
