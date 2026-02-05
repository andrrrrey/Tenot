import { Body, Controller, Delete, Get, Post, Query, Req } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { Roles } from '../auth/roles.decorator';

@Controller('favorites')
@Roles('USER', 'ADMIN')
export class FavoritesController {
  constructor(private service: FavoritesService) {}

  @Get()
  list(@Req() req: any) {
    return this.service.getAll(req.user.userId);
  }

  @Post()
  add(@Req() req: any, @Body('listingId') listingId: number) {
    return this.service.add(req.user.userId, listingId);
  }

  @Delete()
  remove(@Req() req: any, @Query('listingId') listingId: string) {
    return this.service.remove(req.user.userId, +listingId);
  }
}
