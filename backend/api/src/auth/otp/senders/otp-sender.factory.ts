import { ConfigService } from '@nestjs/config';
import { ConsoleOtpSender } from './console.sender';
import { OtpSender } from './otp-sender.interface';
import { SmsRuOtpSender } from './smsru.sender';

export function createOtpSender(config: ConfigService): OtpSender {
  const provider = (config.get<string>('SMS_PROVIDER') || 'console').toLowerCase();

  switch (provider) {
    case 'smsru': {
      const apiId = config.get<string>('SMSRU_API_ID');
      if (!apiId) throw new Error('SMS_PROVIDER=smsru requires SMSRU_API_ID');
      return new SmsRuOtpSender({
        apiId,
        from: config.get<string>('SMSRU_FROM') || undefined,
        test: config.get<string>('SMSRU_TEST') === '1',
        messageTemplate: config.get<string>('SMS_TEMPLATE') || 'Код входа Tenot: {code}',
      });
    }
    case 'console':
      return new ConsoleOtpSender();
    default:
      throw new Error(`Unknown SMS_PROVIDER: ${provider}`);
  }
}
