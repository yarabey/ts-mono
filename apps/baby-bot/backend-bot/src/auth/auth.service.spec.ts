import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { AppConfigService } from '../config/app-config.service';

function makeService(overrides: Partial<{ accessCode: string; telegramBotToken: string }> = {}) {
  const jwt = new JwtService({ secret: 'test-secret' });
  const prisma = {
    user: { upsert: async () => ({ id: 1, role: 'parent' }) },
  } as unknown as PrismaService;
  const config = {
    jwtSecret: 'test-secret',
    accessCode: overrides.accessCode ?? '123456',
    telegramBotToken: overrides.telegramBotToken ?? '',
  } as unknown as AppConfigService;
  return new AuthService(jwt, prisma, config);
}

describe('AuthService.loginWithCode', () => {
  it('issues a verifiable JWT for the correct code', async () => {
    const auth = makeService();
    const res = await auth.loginWithCode('123456');
    expect(res.user.first_name).toBe('WebUser');
    const decoded = new JwtService({ secret: 'test-secret' }).verify(res.token);
    expect(decoded).toMatchObject({ role: 'parent' });
  });

  it('rejects a wrong code with 401', async () => {
    const auth = makeService();
    await expect(auth.loginWithCode('nope')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a missing code', async () => {
    const auth = makeService();
    await expect(auth.loginWithCode(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

describe('AuthService.verifyInitData', () => {
  it('rejects missing initData', async () => {
    const auth = makeService({ telegramBotToken: 'BOT' });
    await expect(auth.verifyInitData(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects tampered initData (bad HMAC)', async () => {
    const auth = makeService({ telegramBotToken: 'BOT' });
    await expect(auth.verifyInitData('user=%7B%22id%22%3A1%7D&hash=deadbeef')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
