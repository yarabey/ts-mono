import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { AuthResponse } from '@acme/baby-bot-domain';
import { PrismaService } from '../prisma/prisma.service';
import { AppConfigService } from '../config/app-config.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger('AuthService');

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  private sign(payload: Record<string, unknown>): string {
    return this.jwt.sign(payload, { secret: this.config.jwtSecret, expiresIn: '30d' });
  }

  async loginWithCode(code: string | undefined): Promise<AuthResponse> {
    if (!code) throw new UnauthorizedException('Missing code');
    if (!this.config.accessCode || code !== this.config.accessCode) {
      throw new UnauthorizedException('Invalid access code');
    }
    const user = { id: 0, telegram_id: 0, first_name: 'WebUser', role: 'parent' };
    this.logger.log('User authenticated via access code');
    return { token: this.sign({ ...user, source: 'code' }), user };
  }

  async verifyInitData(initData: string | undefined): Promise<AuthResponse> {
    if (!initData) throw new UnauthorizedException('Missing initData');
    const botToken = this.config.telegramBotToken;
    if (!botToken) throw new UnauthorizedException('Server configuration error');

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) throw new UnauthorizedException('Invalid initData');
    params.delete('hash');

    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (computedHash !== hash) throw new UnauthorizedException('Invalid signature');

    const userStr = params.get('user');
    if (!userStr) throw new UnauthorizedException('Missing user data');
    const tgUser = JSON.parse(userStr) as {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
    };

    const row = await this.prisma.user.upsert({
      where: { telegramId: BigInt(tgUser.id) },
      update: {
        firstName: tgUser.first_name ?? null,
        lastName: tgUser.last_name ?? null,
        username: tgUser.username ?? null,
      },
      create: {
        telegramId: BigInt(tgUser.id),
        firstName: tgUser.first_name ?? null,
        lastName: tgUser.last_name ?? null,
        username: tgUser.username ?? null,
      },
    });

    const user = {
      id: row.id,
      telegram_id: tgUser.id,
      first_name: tgUser.first_name ?? '',
      role: row.role,
    };
    this.logger.log(`User authenticated: telegram_id=${tgUser.id}`);
    return { token: this.sign(user), user };
  }
}
