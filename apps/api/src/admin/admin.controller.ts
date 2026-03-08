import { Controller, Get } from '@nestjs/common';

@Controller('admin')
export class AdminController {
  @Get('health')
  health(): { uptimeSeconds: number; checkedAt: string } {
    return {
      uptimeSeconds: process.uptime(),
      checkedAt: new Date().toISOString()
    };
  }
}
