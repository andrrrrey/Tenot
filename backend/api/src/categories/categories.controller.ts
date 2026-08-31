import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { CategoriesService, CategoryFieldInput } from './categories.service';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';

const UPLOAD_DIR = './uploads/categories';
mkdirSync(UPLOAD_DIR, { recursive: true });

const imageStorage = diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
  },
});

const imageFileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  if (!file.mimetype.match(/^image\/(jpeg|jpg|png|gif|webp|svg\+xml)$/)) {
    return cb(new Error('Only image files are allowed'), false);
  }
  cb(null, true);
};

@Controller('categories')
export class CategoriesController {
  constructor(private service: CategoriesService) {}

  @Public()
  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Public()
  @Get('filter-profiles')
  filterProfiles() {
    return this.service.getFilterProfiles();
  }

  @Public()
  @Get(':id/fields')
  fields(@Param('id') id: string) {
    return this.service.getEffectiveFields(+id);
  }

  @Roles('ADMIN')
  @Post('import-profile')
  importProfile(@Body('filterProfile') filterProfile: string) {
    return this.service.importProfile(filterProfile);
  }

  @Roles('ADMIN')
  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: imageStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  create(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { name: string; parentId?: string; filterProfile?: string },
  ) {
    const imageUrl = file ? `/uploads/categories/${file.filename}` : undefined;
    return this.service.create({
      name: body.name,
      imageUrl,
      parentId: body.parentId ? Number(body.parentId) : undefined,
      filterProfile: body.filterProfile,
    });
  }

  @Roles('ADMIN')
  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: imageStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  update(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { name?: string; hasCarFilter?: string; filterProfile?: string },
  ) {
    const data: { name?: string; imageUrl?: string; hasCarFilter?: boolean; filterProfile?: string } = {};
    if (body.name) data.name = body.name;
    if (file) data.imageUrl = `/uploads/categories/${file.filename}`;
    if (body.hasCarFilter !== undefined) data.hasCarFilter = body.hasCarFilter === 'true';
    if (body.filterProfile !== undefined) data.filterProfile = body.filterProfile;
    return this.service.update(+id, data);
  }

  @Roles('ADMIN')
  @Post(':id/fields')
  createField(@Param('id') id: string, @Body() body: CategoryFieldInput) {
    return this.service.createField(+id, body);
  }

  @Roles('ADMIN')
  @Patch(':id/fields/:fieldId')
  updateField(
    @Param('id') id: string,
    @Param('fieldId') fieldId: string,
    @Body() body: Partial<CategoryFieldInput>,
  ) {
    return this.service.updateField(+id, +fieldId, body);
  }

  @Roles('ADMIN')
  @Delete(':id/fields/:fieldId')
  removeField(@Param('id') id: string, @Param('fieldId') fieldId: string) {
    return this.service.removeField(+id, +fieldId);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
