import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from '../auth/roles.decorator';

@Controller('admin')
@Roles('ADMIN')
export class AdminController {
  constructor(private service: AdminService) {}

  @Get('users')
  users() {
    return this.service.getUsers();
  }

  @Patch('users/:id/role')
  setRole(@Param('id') id: string, @Body('role') role: 'BUYER' | 'SUPPLIER' | 'ADMIN') {
    return this.service.setUserRole(+id, role);
  }

  @Get('listings')
  listings() {
    return this.service.getListings();
  }

  @Patch('listings/:id/toggle')
  toggleListing(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.service.toggleListing(+id, isActive);
  }

  @Get('stats')
  stats() {
    return this.service.getStats();
  }

  @Get('dashboard')
  dashboard() {
    return this.service.getDashboardStats();
  }
}
