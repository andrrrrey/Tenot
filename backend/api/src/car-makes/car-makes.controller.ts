import { Controller, Get, Param } from '@nestjs/common';
import { CarMakesService } from './car-makes.service';
import { Public } from '../auth/public.decorator';

@Controller('car-makes')
export class CarMakesController {
  constructor(private service: CarMakesService) {}

  @Public()
  @Get()
  findAll() {
    return this.service.findAllMakes();
  }

  @Public()
  @Get(':id/models')
  findModels(@Param('id') id: string) {
    return this.service.findModelsByMake(+id);
  }
}
