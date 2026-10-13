import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { OtpLimiterService } from './otp-limiter.service';
import { OTP_CONFIG, OtpConfig } from './otp.config';
import { normalizeRuMobile } from './phone.util';
import { OTP_SENDER, OtpSender } from './senders/otp-sender.interface';

export interface OtpRequestContext {
  ip: string;
  deviceId?: string | null;
}

@Injectable()
export class OtpService {
  private readonly logger = new Logger('OtpService');
  private readonly secret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly limiter: OtpLimiterService,
    @Inject(OTP_SENDER) private readonly sender: OtpSender,
    @Inject(OTP_CONFIG) private readonly cfg: OtpConfig,
    config: ConfigService,
  ) {
    this.secret = config.get<string>('OTP_SECRET') || config.get<string>('JWT_SECRET') || 'dev_secret';
  }

  normalize(rawPhone: string): string {
    const phone = normalizeRuMobile(rawPhone);
    if (!phone) throw new BadRequestException('Укажите российский мобильный номер');
    return phone;
  }

  /** Выпускает и отправляет код. Ответ не зависит от того, зарегистрирован ли номер. */
  async request(rawPhone: string, ctx: OtpRequestContext) {
    const phone = this.normalize(rawPhone);
    const code =
      this.cfg.testCode ?? String(randomInt(0, 10 ** this.cfg.codeLength)).padStart(this.cfg.codeLength, '0');

    // Проверка лимитов и запись кода — под advisory-lock на номер,
    // чтобы параллельные запросы не обошли ограничение повторной отправки.
    const otp = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'otp:' + phone}))`;
      await this.limiter.assertCanSend(tx, { phone, ...ctx });
      return tx.phoneOtp.create({
        data: {
          phone,
          codeHash: this.hash(phone, code),
          ip: ctx.ip,
          deviceId: ctx.deviceId || null,
          expiresAt: new Date(Date.now() + this.cfg.ttlSec * 1000),
        },
        select: { id: true },
      });
    });

    try {
      await this.sender.send(phone, code);
    } catch (e) {
      // Запись остаётся в журнале (считается в лимитах), но код недействителен
      await this.prisma.phoneOtp.update({ where: { id: otp.id }, data: { usedAt: new Date() } });
      throw e;
    }

    return { ok: true, retryAfter: this.cfg.resendSec, expiresIn: this.cfg.ttlSec, codeLength: this.cfg.codeLength };
  }

  /** Проверяет код; возвращает нормализованный номер при успехе. */
  async verify(rawPhone: string, code: string): Promise<string> {
    const phone = this.normalize(rawPhone);
    const invalid = () => new BadRequestException('Неверный или устаревший код');

    // Действителен только последний выданный код
    const otp = await this.prisma.phoneOtp.findFirst({
      where: { phone },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || otp.usedAt || otp.expiresAt.getTime() < Date.now()) throw invalid();

    // Атомарно занимаем попытку; если попытки кончились — код сгорает
    const claimed = await this.prisma.phoneOtp.updateMany({
      where: { id: otp.id, usedAt: null, attempts: { lt: this.cfg.maxAttempts } },
      data: { attempts: { increment: 1 } },
    });
    if (claimed.count === 0) throw new BadRequestException('Превышено число попыток, запросите новый код');

    const expected = Buffer.from(otp.codeHash, 'hex');
    const actual = Buffer.from(this.hash(phone, String(code ?? '').trim()), 'hex');
    if (!timingSafeEqual(expected, actual)) throw invalid();

    const used = await this.prisma.phoneOtp.updateMany({
      where: { id: otp.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (used.count === 0) throw invalid();

    return phone;
  }

  private hash(phone: string, code: string) {
    return createHmac('sha256', this.secret).update(`${phone}:${code}`).digest('hex');
  }
}
