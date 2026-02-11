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
import { CategoriesService } from './categories.service';
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
    @Body() body: { name: string; parentId?: string },
  ) {
    const imageUrl = file ? `/uploads/categories/${file.filename}` : undefined;
    return this.service.create({
      name: body.name,
      imageUrl,
      parentId: body.parentId ? Number(body.parentId) : undefined,
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
    @Body() body: { name?: string },
  ) {
    const data: { name?: string; imageUrl?: string } = {};
    if (body.name) data.name = body.name;
    if (file) data.imageUrl = `/uploads/categories/${file.filename}`;
    return this.service.update(+id, data);
  }

  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(+id);
  }
}
