import { Body, Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';

@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  @Roles('USER', 'ADMIN')
  @Get('me')
  getProfile(@Req() req: any) {
    return this.service.getProfile(req.user.userId);
  }

  @Roles('USER', 'ADMIN')
  @Patch('me')
  updateProfile(@Req() req: any, @Body() body: { name?: string; phone?: string }) {
    return this.service.updateProfile(req.user.userId, body);
  }

  @Public()
  @Get(':id/public')
  getPublicProfile(@Param('id') id: string) {
    return this.service.getPublicProfile(+id);
  }
}
