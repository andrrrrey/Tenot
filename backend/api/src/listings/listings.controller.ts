import {
  BadRequestException,
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
import {
  Media360Service,
  SPIN_BATCH_MAX,
  SPIN_FRAME_MAX_SIZE,
  SPIN_MAX_FRAMES,
  assertUploadId,
  spinTmpDir,
} from './media360.service';
import { CreateListingDto } from './dto.create-listing';
import { Roles } from '../auth/roles.decorator';
import { OptionalAuth, Public } from '../auth/public.decorator';

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

// Кадры 360°-вращения: uploadId и startIndex приходят в query (не зависят от порядка
// полей в multipart), файлы сразу пишутся во временную папку загрузки как frame_NNN.
const spinFramesStorage = diskStorage({
  destination: (req: any, _file, cb) => {
    try {
      const uploadId = assertUploadId(req.query.uploadId);
      const dir = spinTmpDir(+req.params.id, uploadId);
      mkdirSync(dir, { recursive: true });
      cb(null, dir);
    } catch (e) {
      cb(e as Error, '');
    }
  },
  filename: (req: any, file, cb) => {
    const start = Number(req.query.startIndex);
    if (!Number.isInteger(start) || start < 0) return cb(new BadRequestException('Некорректный startIndex'), '');
    req._spinCounter = (req._spinCounter ?? 0) + 1;
    const index = start + req._spinCounter - 1;
    if (index >= SPIN_MAX_FRAMES) return cb(new BadRequestException(`Максимум ${SPIN_MAX_FRAMES} кадров`), '');
    const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg';
    cb(null, `frame_${String(index).padStart(3, '0')}.${ext}`);
  },
});

const spinFrameFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  if (/^image\/(jpeg|jpg|png|webp)$/.test(file.mimetype)) cb(null, true);
  else cb(new BadRequestException('Кадры 360° — только JPEG, PNG или WebP'), false);
};

@Controller('listings')
export class ListingsController {
  constructor(private service: ListingsService, private media360: Media360Service) {}

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
  getSuggestions(@Query('q') q: string, @Query('fuzzy') fuzzy?: string) {
    if (fuzzy === 'true') return this.service.getFuzzyCorrection(q || '');
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
    @Query('attributeFilters') attributeFilters?: string,
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
      attributeFilters: this.parseAttributeFilters(attributeFilters),
    });
  }

  private parseAttributeFilters(value?: string) {
    if (!value) return undefined;
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(+id);
  }

  @Public()
  @OptionalAuth()
  @Post(':id/view')
  registerView(@Req() req: any, @Param('id') id: string) {
    return this.service.registerView(+id, req.user?.userId);
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

  // ── 360° content ────────────────────────────────────────────────────────────

  @Public()
  @Get(':id/360')
  get360(@Param('id') id: string) {
    return this.media360.get360(+id);
  }

  @Roles('USER', 'ADMIN')
  @Post(':id/360/spin/frames')
  @UseInterceptors(
    AnyFilesInterceptor({
      storage: spinFramesStorage,
      fileFilter: spinFrameFilter,
      limits: { files: SPIN_BATCH_MAX, fileSize: SPIN_FRAME_MAX_SIZE },
    }),
  )
  uploadSpinFrames(
    @Req() req: any,
    @Param('id') id: string,
    @Query('uploadId') uploadId: string,
    @Query('startIndex') startIndex: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.media360.acceptFrames(+id, req.user.userId, assertUploadId(uploadId), +startIndex, files || []);
  }

  @Roles('USER', 'ADMIN')
  @Post(':id/360/spin/commit')
  commitSpin(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { uploadId?: string; count?: number },
  ) {
    return this.media360.commitSpin(+id, req.user.userId, assertUploadId(body?.uploadId), Number(body?.count));
  }

  @Roles('USER', 'ADMIN')
  @Delete(':id/360/spin')
  deleteSpin(@Req() req: any, @Param('id') id: string) {
    return this.media360.deleteSpin(+id, req.user.userId);
  }
}
