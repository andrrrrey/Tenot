import { Module } from '@nestjs/common';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { Media360Service } from './media360.service';
import { PanoramaStitchService } from './panorama-stitch.service';
import { PlateBlurService } from './plate-blur.service';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [CategoriesModule],
  controllers: [ListingsController],
  providers: [ListingsService, Media360Service, PanoramaStitchService, PlateBlurService],
})
export class ListingsModule {}
