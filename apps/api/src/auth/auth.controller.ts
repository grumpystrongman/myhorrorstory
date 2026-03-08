import { Body, Controller, Inject, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Post('signup')
  signUp(@Body() input: unknown): { userId: string; accessToken: string; refreshToken: string } {
    return this.authService.signUp(input);
  }

  @Post('signin')
  signIn(@Body() input: unknown): { userId: string; accessToken: string; refreshToken: string } {
    return this.authService.signIn(input);
  }
}
