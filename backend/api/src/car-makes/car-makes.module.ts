import { Module } from '@nestjs/common';
import { CarMakesController } from './car-makes.controller';
import { CarMakesService } from './car-makes.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CarMakesController],
  providers: [CarMakesService],
})
export class CarMakesModule {}
