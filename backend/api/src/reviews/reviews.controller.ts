import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto.create-review';
import { Public } from '../auth/public.decorator';

@Controller('reviews')
export class ReviewsController {
  constructor(private service: ReviewsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateReviewDto) {
    return this.service.create(req.user.userId, dto);
  }

  @Public()
  @Get('user/:userId')
  getByUser(@Param('userId') userId: string) {
    return this.service.getApprovedByUser(+userId);
  }

  @Public()
  @Get('user/:userId/stats')
  getStats(@Param('userId') userId: string) {
    return this.service.getUserStats(+userId);
  }

  @Get('my')
  getMy(@Req() req: any) {
    return this.service.getMyReviews(req.user.userId);
  }
}
