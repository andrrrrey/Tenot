import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { OTP_CONFIG, OtpConfig } from './otp.config';
import { TooManyRequestsException } from './too-many-requests.exception';

const HOUR = 3600_000;
const DAY = 24 * HOUR;

type Tx = Prisma.TransactionClient;

/**
 * Лимиты отправки кодов. Считаются по журналу PhoneOtp (Postgres), поэтому
 * работают и после рестарта, и при нескольких инстансах API.
 */
@Injectable()
export class OtpLimiterService {
  private readonly logger = new Logger('OtpLimiter');

  constructor(@Inject(OTP_CONFIG) private readonly cfg: OtpConfig) {}

  async assertCanSend(tx: Tx, ctx: { phone: string; ip: string; deviceId?: string | null }) {
    const now = Date.now();

    // 1) Повторная отправка на тот же номер — не чаще resendSec
    const last = await tx.phoneOtp.findFirst({
      where: { phone: ctx.phone },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (last) {
      const wait = last.createdAt.getTime() + this.cfg.resendSec * 1000 - now;
      if (wait > 0) {
        throw new TooManyRequestsException('Повторно запросить код можно позже', wait / 1000);
      }
    }

    // 2) Лимиты по номеру, IP и устройству
    await this.checkWindow(tx, { phone: ctx.phone }, HOUR, this.cfg.perPhoneHour, 'номера');
    await this.checkWindow(tx, { phone: ctx.phone }, DAY, this.cfg.perPhoneDay, 'номера');
    await this.checkWindow(tx, { ip: ctx.ip }, HOUR, this.cfg.perIpHour, 'IP');
    await this.checkWindow(tx, { ip: ctx.ip }, DAY, this.cfg.perIpDay, 'IP');
    if (ctx.deviceId) {
      await this.checkWindow(tx, { deviceId: ctx.deviceId }, HOUR, this.cfg.perDeviceHour, 'устройства');
    }

    // 3) Глобальный предохранитель от выкачивания SMS-бюджета
    const global = await tx.phoneOtp.count({ where: { createdAt: { gte: new Date(now - HOUR) } } });
    if (global >= this.cfg.globalHour) {
      this.logger.error(`Global OTP limit reached: ${global}/${this.cfg.globalHour} per hour`);
      throw new ServiceUnavailableException('Сервис временно недоступен, попробуйте позже');
    }
  }

  private async checkWindow(
    tx: Tx,
    where: Prisma.PhoneOtpWhereInput,
    windowMs: number,
    limit: number,
    subject: string,
  ) {
    const since = new Date(Date.now() - windowMs);
    const recent = await tx.phoneOtp.findMany({
      where: { ...where, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { createdAt: true },
    });
    if (recent.length < limit) return;

    // Слот освободится, когда самая старая из последних `limit` записей выйдет из окна
    const oldest = recent[recent.length - 1].createdAt.getTime();
    const retryAfter = (oldest + windowMs - Date.now()) / 1000;
    this.logger.warn(`OTP limit for ${subject}: ${JSON.stringify(where)} ${limit}/${windowMs / HOUR}h`);
    throw new TooManyRequestsException(`Слишком много запросов кода с этого ${subject}, попробуйте позже`, retryAfter);
  }
}
