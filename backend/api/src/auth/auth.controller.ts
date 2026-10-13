import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto.register';
import { PhoneRequestDto, PhoneVerifyDto } from './dto.phone';
import { clientDeviceId, clientIp } from './client-context';
import { OtpService } from './otp/otp.service';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService, private otp: OtpService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body.email, body.password);
  }

  @Public()
  @Post('phone/request')
  @HttpCode(200)
  requestPhoneCode(@Body() dto: PhoneRequestDto, @Req() req: Request) {
    return this.otp.request(dto.phone, { ip: clientIp(req), deviceId: clientDeviceId(req, dto.deviceId) });
  }

  @Public()
  @Post('phone/verify')
  @HttpCode(200)
  async verifyPhoneCode(@Body() dto: PhoneVerifyDto) {
    const phone = await this.otp.verify(dto.phone, dto.code);
    return this.auth.loginByPhone(phone);
  }
}
