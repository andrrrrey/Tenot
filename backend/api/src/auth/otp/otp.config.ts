import { ConfigService } from '@nestjs/config';

export interface OtpConfig {
  codeLength: number;
  /** Тестовый режим: фиксированный код, SMS не отправляются (только при SMS_PROVIDER=console) */
  testCode: string | null;
  ttlSec: number;
  resendSec: number;
  maxAttempts: number;
  perPhoneHour: number;
  perPhoneDay: number;
  perIpHour: number;
  perIpDay: number;
  perDeviceHour: number;
  globalHour: number;
}

export const OTP_CONFIG = Symbol('OTP_CONFIG');

export function loadOtpConfig(config: ConfigService): OtpConfig {
  const num = (key: string, def: number) => {
    const v = Number(config.get<string>(key));
    return Number.isFinite(v) && v > 0 ? v : def;
  };
  const testCode = (config.get<string>('OTP_TEST_CODE') || '').trim() || null;
  if (testCode) {
    const provider = (config.get<string>('SMS_PROVIDER') || 'console').toLowerCase();
    if (provider !== 'console') {
      throw new Error('OTP_TEST_CODE разрешён только при SMS_PROVIDER=console');
    }
    if (!/^\d{4,8}$/.test(testCode)) throw new Error('OTP_TEST_CODE должен состоять из 4–8 цифр');
  }
  return {
    testCode,
    codeLength: testCode ? testCode.length : num('OTP_CODE_LENGTH', 4),
    ttlSec: num('OTP_TTL_SEC', 300),
    resendSec: num('OTP_RESEND_SEC', 60),
    maxAttempts: num('OTP_MAX_ATTEMPTS', 5),
    perPhoneHour: num('OTP_LIMIT_PHONE_HOUR', 5),
    perPhoneDay: num('OTP_LIMIT_PHONE_DAY', 10),
    perIpHour: num('OTP_LIMIT_IP_HOUR', 10),
    perIpDay: num('OTP_LIMIT_IP_DAY', 30),
    perDeviceHour: num('OTP_LIMIT_DEVICE_HOUR', 5),
    globalHour: num('OTP_LIMIT_GLOBAL_HOUR', 300),
  };
}
