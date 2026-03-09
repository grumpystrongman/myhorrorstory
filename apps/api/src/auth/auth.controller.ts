import { Body, Controller, Inject, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import type { LegalAcceptanceStatus } from '@myhorrorstory/contracts';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('signup')
  signUp(@Body() input: unknown): {
    userId: string;
    accessToken: string;
    refreshToken: string;
    legal: LegalAcceptanceStatus;
  } {
    return this.authService.signUp(input);
  }

  @Post('signin')
  signIn(@Body() input: unknown): {
    userId: string;
    accessToken: string;
    refreshToken: string;
    legal: LegalAcceptanceStatus;
  } {
    return this.authService.signIn(input);
  }

  @Post('legal/accept')
  acceptLegal(@Body() input: unknown): LegalAcceptanceStatus {
    return this.authService.acceptLegal(input);
  }
}
