import { Body, Controller, Post } from '@nestjs/common';
import { AccessCodePayloadSchema, VerifyInitDataPayloadSchema } from '@acme/baby-bot-domain';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('code')
  loginWithCode(@Body() body: unknown) {
    return this.auth.loginWithCode(AccessCodePayloadSchema.parse(body).code);
  }

  @Public()
  @Post('verify')
  verify(@Body() body: unknown) {
    return this.auth.verifyInitData(VerifyInitDataPayloadSchema.parse(body).initData);
  }
}
