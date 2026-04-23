import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto.create-listing';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';

const LISTINGS_UPLOAD_DIR = './uploads/listings';
mkdirSync(LISTINGS_UPLOAD_DIR, { recursive: true });

const listingMediaStorage = diskStorage({
  destination: LISTINGS_UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
  },
});

const mediaFileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  if (
    file.mimetype.match(/^image\/(jpeg|jpg|png|gif|webp)$/) ||
    file.mimetype.match(/^video\/(mp4|webm|ogg|quicktime)$/)
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only image and video files are allowed'), false);
  }
};

@Controller('listings')
export class ListingsController {
  constructor(private service: ListingsService) {}

  @Roles('USER', 'ADMIN')
  @Get('my')
  getMy(@Req() req: any) {
    return this.service.getMyListings(req.user.userId);
  }

  @Public()
  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.service.findByUserId(+userId);
  }

  @Public()
  @Get('average-price')
  getAveragePrice(@Query('categoryId') categoryId: string) {
    if (!categoryId) return { avg: null };
    return this.service.getAveragePrice(+categoryId);
  }

  @Public()
  @Get('suggestions')
  getSuggestions(@Query('q') q: string) {
    return this.service.getSearchSuggestions(q || '');
  }

  @Public()
  @Get()
  findAll(
    @Query('categoryId') categoryId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('search') search?: string,
    @Query('cityId') cityId?: string,
    @Query('carMakeId') carMakeId?: string,
    @Query('carModelId') carModelId?: string,
    @Query('carYearFrom') carYearFrom?: string,
    @Query('carYearTo') carYearTo?: string,
  ) {
    return this.service.findAll({
      categoryId: categoryId ? +categoryId : undefined,
      minPrice: minPrice ? +minPrice : undefined,
      maxPrice: maxPrice ? +maxPrice : undefined,
      search,
      cityId: cityId ? +cityId : undefined,
      carMakeId: carMakeId ? +carMakeId : undefined,
      carModelId: carModelId ? +carModelId : undefined,
      carYearFrom: carYearFrom ? +carYearFrom : undefined,
      carYearTo: carYearTo ? +carYearTo : undefined,
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
  update(@Req() req: any, @Param('id') id: string, @Body() dto: Partial<CreateListingDto>) {
    return this.service.update(+id, req.user.userId, dto);
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

  // ── Media endpoints ──────────────────────────────────────────────────────────

  @Roles('USER', 'ADMIN')
  @Post(':id/media')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: listingMediaStorage,
      fileFilter: mediaFileFilter,
      limits: { files: 11, fileSize: 20 * 1024 * 1024 },
    }),
  )
  uploadMedia(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('coverIndex') coverIndex?: string,
  ) {
    return this.service.uploadMedia(
      +id,
      req.user.userId,
      files || [],
      coverIndex !== undefined ? +coverIndex : undefined,
    );
  }

  @Roles('USER', 'ADMIN')
  @Delete(':id/media/:mediaId')
  deleteMedia(
    @Req() req: any,
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
  ) {
    return this.service.deleteMedia(+id, req.user.userId, +mediaId);
  }

  @Roles('USER', 'ADMIN')
  @Patch(':id/media/:mediaId/cover')
  setCover(
    @Req() req: any,
    @Param('id') id: string,
    @Param('mediaId') mediaId: string,
  ) {
    return this.service.setCover(+id, req.user.userId, +mediaId);
  }
}
