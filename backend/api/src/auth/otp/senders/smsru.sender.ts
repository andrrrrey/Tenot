import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { OtpSender } from './otp-sender.interface';

export interface SmsRuOptions {
  apiId: string;
  from?: string;
  test?: boolean;
  messageTemplate: string;
}

/** SMS.ru — https://sms.ru/api/send */
export class SmsRuOtpSender implements OtpSender {
  readonly name = 'smsru';
  private readonly logger = new Logger('SmsRuOtpSender');

  constructor(private readonly opts: SmsRuOptions) {}

  async send(phone: string, code: string) {
    const params = new URLSearchParams({
      api_id: this.opts.apiId,
      to: phone,
      msg: this.opts.messageTemplate.replace('{code}', code),
      json: '1',
    });
    if (this.opts.from) params.set('from', this.opts.from);
    if (this.opts.test) params.set('test', '1');

    let data: any;
    try {
      const res = await fetch('https://sms.ru/sms/send', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
        signal: AbortSignal.timeout(10_000),
      });
      data = await res.json();
    } catch (e) {
      this.logger.error(`sms.ru request failed: ${(e as Error).message}`);
      throw new ServiceUnavailableException('Не удалось отправить SMS, попробуйте позже');
    }

    const sms = data?.sms?.[phone];
    if (data?.status !== 'OK' || sms?.status !== 'OK') {
      this.logger.error(
        `sms.ru error: ${data?.status_code} ${data?.status_text ?? ''} / ${sms?.status_code} ${sms?.status_text ?? ''}`,
      );
      throw new ServiceUnavailableException('Не удалось отправить SMS, попробуйте позже');
    }
  }
}
