import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto.register';
import { UpdateProfileDto } from './dto.update-profile';
import { Public } from './public.decorator';
import { Roles } from './roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

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

  @Roles('USER', 'ADMIN')
  @Get('profile')
  getProfile(@Req() req: any) {
    return this.auth.getProfile(req.user.userId);
  }

  @Roles('USER', 'ADMIN')
  @Patch('profile')
  updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(req.user.userId, dto);
  }
}
