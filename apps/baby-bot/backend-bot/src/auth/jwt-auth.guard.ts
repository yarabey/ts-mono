import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { FastifyRequest } from 'fastify';
import { AppConfigService } from '../config/app-config.service';
import { IS_PUBLIC_KEY } from './public.decorator';

export interface JwtUser {
  id: number;
  telegram_id: number;
  first_name?: string;
  role?: string;
}

export interface AuthedRequest extends FastifyRequest {
  user?: JwtUser;
}

/**
 * Protects every route unless it (or its controller) is marked `@Public()`.
 * Verifies the Bearer JWT and attaches the decoded user to the request.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly config: AppConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = header.slice('Bearer '.length).trim();
    try {
      req.user = await this.jwt.verifyAsync<JwtUser>(token, {
        secret: this.config.jwtSecret,
      });
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
