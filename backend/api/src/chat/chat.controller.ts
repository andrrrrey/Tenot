import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto.create-message';

@Controller('chat')
export class ChatController {
  constructor(private service: ChatService) {}

  @Post('send')
  send(@Req() req: any, @Body() dto: CreateMessageDto) {
    return this.service.sendMessage(req.user, dto);
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
