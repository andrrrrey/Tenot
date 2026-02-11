import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
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
  setRole(@Param('id') id: string, @Body('role') role: 'USER' | 'ADMIN') {
    return this.service.setUserRole(+id, role);
  }

  @Get('listings')
  listings(
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('userId') userId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.service.getListings({
      search: search || undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
      userId: userId ? Number(userId) : undefined,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    });
  }

  @Patch('listings/:id/toggle')
  toggleListing(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.service.toggleListing(+id, isActive);
  }

  @Get('stats')
  stats() {
    return this.service.getStats();
  }
}
