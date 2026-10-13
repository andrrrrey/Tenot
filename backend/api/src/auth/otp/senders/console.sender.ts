import { Logger } from '@nestjs/common';
import { OtpSender } from './otp-sender.interface';

/** Для разработки и тестов: код пишется в лог API, SMS не отправляется. */
export class ConsoleOtpSender implements OtpSender {
  readonly name = 'console';
  private readonly logger = new Logger('ConsoleOtpSender');

  async send(phone: string, code: string) {
    this.logger.warn(`OTP for ${phone}: ${code}`);
  }
}
