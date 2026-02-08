import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto.create-listing';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';

@Controller('listings')
export class ListingsController {
  constructor(private service: ListingsService) {}

  @Roles('USER', 'ADMIN')
  @Get('my')
  getMy(@Req() req: any) {
    return this.service.getMyListings(req.user.userId);
  }

  @Public()
  @Get()
  findAll(
    @Query('categoryId') categoryId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll({
      categoryId: categoryId ? +categoryId : undefined,
      minPrice: minPrice ? +minPrice : undefined,
      maxPrice: maxPrice ? +maxPrice : undefined,
      search,
    });
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Roles('USER', 'ADMIN')
  @Post()
  create(@Req() req: any, @Body() dto: CreateListingDto) {
    return this.service.createByUserId(req.user.userId, dto);
  }

  @Roles('USER', 'ADMIN')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateListingDto>) {
    return this.service.update(+id, dto);
  }

  @Roles('USER', 'ADMIN')
  @Patch(':id/toggle')
  toggle(@Param('id') id: string, @Body('isActive') isActive: boolean) {
    return this.service.toggle(+id, isActive);
  }

  @Roles('USER', 'ADMIN')
  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.service.deleteByOwner(+id, req.user.userId);
  }
}
