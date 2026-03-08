import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidUnknownValues: true
    })
  );

  app.setGlobalPrefix('api/v1');
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 8787);
}

bootstrap().catch((error) => {
  console.error('Failed to start API', error);
  process.exit(1);
});
