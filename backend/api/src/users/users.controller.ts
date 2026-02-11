import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { mkdirSync } from 'fs';
import { UsersService } from './users.service';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';

const UPLOAD_DIR = './uploads/avatars';
mkdirSync(UPLOAD_DIR, { recursive: true });

const avatarStorage = diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
  },
});

const imageFileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  if (!file.mimetype.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
    return cb(new Error('Only image files are allowed'), false);
  }
  cb(null, true);
};

@Controller('users')
export class UsersController {
  constructor(private service: UsersService) {}

  @Roles('USER', 'ADMIN')
  @Get('me')
  getProfile(@Req() req: any) {
    return this.service.getProfile(req.user.userId);
  }

  @Roles('USER', 'ADMIN')
  @Patch('me')
  updateProfile(@Req() req: any, @Body() body: { name?: string; phone?: string; cityId?: number | null }) {
    return this.service.updateProfile(req.user.userId, body);
  }

  @Roles('USER', 'ADMIN')
  @Post('me/avatar')
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: avatarStorage,
      fileFilter: imageFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadAvatar(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    return this.service.updateAvatar(req.user.userId, avatarUrl);
  }

  @Public()
  @Get(':id/public')
  getPublicProfile(@Param('id') id: string) {
    return this.service.getPublicProfile(+id);
  }
}
