import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthedRequest, JwtUser } from './jwt-auth.guard';

/** Injects the JWT user attached by JwtAuthGuard into a controller handler. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUser | undefined => {
    return ctx.switchToHttp().getRequest<AuthedRequest>().user;
  },
);
