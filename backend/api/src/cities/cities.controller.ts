import { Controller, Get, Query } from '@nestjs/common';
import { CitiesService } from './cities.service';
import { Public } from '../auth/public.decorator';

@Controller('cities')
export class CitiesController {
  constructor(private service: CitiesService) {}

  @Public()
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Public()
  @Get('search')
  search(@Query('q') q: string) {
    return this.service.search(q || '');
  }
}
