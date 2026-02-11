import { Controller, Get } from '@nestjs/common';
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
}
