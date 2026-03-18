import {
  BadRequestException,
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
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto.create-message';

const AUDIO_UPLOAD_DIR = './uploads/audio';
mkdirSync(AUDIO_UPLOAD_DIR, { recursive: true });

const audioStorage = diskStorage({
  destination: AUDIO_UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${uniqueSuffix}${extname(file.originalname) || '.webm'}`);
  },
});

const audioFileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
  if (file.mimetype.match(/^audio\//)) {
    cb(null, true);
  } else {
    cb(new BadRequestException('Only audio files are allowed'), false);
  }
};

@Controller('chat')
export class ChatController {
  constructor(private service: ChatService) {}

  @Post('send')
  send(@Req() req: any, @Body() dto: CreateMessageDto) {
    return this.service.sendMessage(req.user, dto);
  }

  @Post('send/audio')
  @UseInterceptors(
    FileInterceptor('audio', {
      storage: audioStorage,
      fileFilter: audioFileFilter,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  sendAudio(
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { listingId: string; receiverId: string; audioDuration?: string },
  ) {
    if (!file) throw new BadRequestException('Audio file is required');
    const audioUrl = `/uploads/audio/${file.filename}`;
    const audioDuration = body.audioDuration ? parseFloat(body.audioDuration) : undefined;
    return this.service.sendAudioMessage(req.user, {
      listingId: +body.listingId,
      receiverId: +body.receiverId,
    }, audioUrl, audioDuration);
  }

  @Get('my')
  getMy(@Req() req: any) {
    return this.service.getChats(req.user.userId);
  }

  @Get(':chatId/messages')
  getMessages(@Req() req: any, @Param('chatId') chatId: string) {
    return this.service.getMessages(+chatId, req.user.userId);
  }

  @Patch(':chatId/read')
  markAsRead(@Req() req: any, @Param('chatId') chatId: string) {
    return this.service.markMessagesAsRead(+chatId, req.user.userId);
  }
}
