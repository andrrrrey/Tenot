import { Module } from '@nestjs/common';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';
import { Media360Service } from './media360.service';
import { CategoriesModule } from '../categories/categories.module';

@Module({
  imports: [CategoriesModule],
  controllers: [ListingsController],
  providers: [ListingsService, Media360Service],
})
export class ListingsModule {}
