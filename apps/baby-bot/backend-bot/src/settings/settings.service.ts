import { BadRequestException, Injectable } from '@nestjs/common';
import { SettingValue } from '@acme/baby-bot-domain';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: number, key: string): Promise<SettingValue> {
    const row = await this.prisma.userSetting.findUnique({
      where: { userId_key: { userId, key } },
    });
    return { key, value: row?.value ?? '' };
  }

  async set(userId: number, key: string, value: string | null | undefined): Promise<SettingValue> {
    if (value === undefined || value === null) throw new BadRequestException('Missing value');
    const stored = String(value);
    await this.prisma.userSetting.upsert({
      where: { userId_key: { userId, key } },
      update: { value: stored },
      create: { userId, key, value: stored },
    });
    return { key, value: stored };
  }
}
