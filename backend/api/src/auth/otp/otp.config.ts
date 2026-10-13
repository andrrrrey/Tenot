import { ConfigService } from '@nestjs/config';

export interface OtpConfig {
  codeLength: number;
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
  return {
    codeLength: num('OTP_CODE_LENGTH', 4),
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
