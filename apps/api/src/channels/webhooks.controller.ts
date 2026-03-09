import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Inject,
  Post,
  Req,
  UnauthorizedException
} from '@nestjs/common';
import {
  coerceWebhookBodyToRecord,
  verifyTelegramSecretToken,
  verifyTwilioSignature
} from '@myhorrorstory/messaging';
import { ChannelsService } from './channels.service.js';

type RequestLike = {
  header(name: string): string | undefined;
  get(name: string): string | undefined;
  protocol: string;
  originalUrl: string;
};

@Controller('webhooks')
export class WebhooksController {
  constructor(@Inject(ChannelsService) private readonly channelsService: ChannelsService) {}

  @Post('twilio')
  @HttpCode(200)
  processTwilio(
    @Body() body: unknown,
    @Headers('x-twilio-signature') signature: string | undefined,
    @Req() request: RequestLike
  ): ReturnType<ChannelsService['processTwilioWebhook']> {
    const shouldVerify = process.env.TWILIO_VALIDATE_SIGNATURES === 'true';
    if (shouldVerify) {
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      if (!authToken) {
        throw new UnauthorizedException('TWILIO_AUTH_TOKEN not configured.');
      }

      const forwardedProtoHeader = request.header('x-forwarded-proto');
      const forwardedProto = forwardedProtoHeader?.split(',')[0]?.trim();
      const protocol = forwardedProto || request.protocol;
      const host = request.get('host') ?? 'localhost';
      const requestUrl = `${protocol}://${host}${request.originalUrl}`;
      const requestBody = coerceWebhookBodyToRecord(body);

      const valid = verifyTwilioSignature({
        authToken,
        requestUrl,
        requestBody,
        signature
      });

      if (!valid) {
        throw new UnauthorizedException('Invalid Twilio signature.');
      }
    }

    try {
      return this.channelsService.processTwilioWebhook(body);
    } catch (error) {
      if (error instanceof Error && error.message === 'twilio_payload_invalid') {
        throw new BadRequestException('Invalid Twilio payload.');
      }
      throw error;
    }
  }

  @Post('telegram')
  @HttpCode(200)
  processTelegram(
    @Body() body: unknown,
    @Headers('x-telegram-bot-api-secret-token') telegramSecret: string | undefined
  ): ReturnType<ChannelsService['processTelegramWebhook']> {
    const valid = verifyTelegramSecretToken({
      expectedToken: process.env.TELEGRAM_WEBHOOK_SECRET,
      receivedToken: telegramSecret
    });

    if (!valid) {
      throw new UnauthorizedException('Invalid Telegram webhook secret.');
    }

    try {
      return this.channelsService.processTelegramWebhook(body);
    } catch (error) {
      if (error instanceof Error && error.message === 'telegram_payload_invalid') {
        throw new BadRequestException('Invalid Telegram payload.');
      }
      throw error;
    }
  }
}
