import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { OtpService } from './otp/otp.service';
import { OtpLimiterService } from './otp/otp-limiter.service';
import { OTP_CONFIG, loadOtpConfig } from './otp/otp.config';
import { OTP_SENDER } from './otp/senders/otp-sender.interface';
import { createOtpSender } from './otp/senders/otp-sender.factory';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '30d' },
      }),
    }),
  ],
  providers: [
    AuthService,
    JwtStrategy,
    OtpService,
    OtpLimiterService,
    { provide: OTP_CONFIG, inject: [ConfigService], useFactory: loadOtpConfig },
    // Смена SMS-провайдера/канала — через env SMS_PROVIDER, см. otp/senders
    { provide: OTP_SENDER, inject: [ConfigService], useFactory: createOtpSender },
  ],
  controllers: [AuthController],
  exports: [JwtModule],
})
export class AuthModule {}
