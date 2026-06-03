import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { AppConfigModule } from './config/app-config.module';
import { PrismaModule } from './prisma/prisma.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { DiaryModule } from './diary/diary.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { ChildrenModule } from './children/children.module';
import { ExportModule } from './export/export.module';
import { TimersModule } from './timers/timers.module';
import { PhotosModule } from './photos/photos.module';
import { SettingsModule } from './settings/settings.module';
import { StatsModule } from './stats/stats.module';
import { RawEntriesModule } from './raw-entries/raw-entries.module';
import { TelegramModule } from './telegram/telegram.module';
import { AliceModule } from './alice/alice.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AiProcessorModule } from './ai-processor/ai-processor.module';
import { DataImportModule } from './data-import/data-import.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    ScheduleModule.forRoot(),
    // Secret + expiry are passed explicitly at every sign/verify call
    // (AuthService, JwtAuthGuard) from AppConfigService, so the module itself
    // needs no configured secret — avoids a bootstrap-ordering dependency.
    JwtModule.register({ global: true }),
    DiaryModule,
    AuthModule,
    EventsModule,
    ChildrenModule,
    ExportModule,
    TimersModule,
    PhotosModule,
    SettingsModule,
    StatsModule,
    RawEntriesModule,
    TelegramModule,
    AliceModule,
    NotificationsModule,
    AiProcessorModule,
    DataImportModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
