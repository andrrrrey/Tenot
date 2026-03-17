import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [MulterModule.register({})],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
